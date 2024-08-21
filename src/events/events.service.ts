import { Injectable } from '@nestjs/common';
import { Domain, DomainRole, EventType, Prisma } from '@prisma/client';
import { createHmac } from 'crypto';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import { isbot } from 'isbot';
import { referrers } from 'src/data/referrers';
import { DbService } from 'src/db/db.service';
import { GeoService } from 'src/geo/geo.service';
import { objectKeys } from 'src/utils/object-keys';
import * as uaParser from 'ua-parser-js';
import { CreateEventDto } from './dto/create-event.dto';
import { FilterEventsDto, Period } from './dto/filter-events.dto';
import { getTimes } from './utils/get-times';
import { buildFilters } from './utils/build-filters';

dayjs.extend(utc);

export const periodIntervalMapping: Record<Period, 'h' | 'd' | 'w' | 'M'> = {
  d: 'h',
  '7d': 'd',
  '30d': 'd',
  m: 'd',
  y: 'M',
};

@Injectable()
export class EventsService {
  constructor(
    private readonly dbService: DbService,
    private readonly geoService: GeoService,
  ) {}

  async create(
    createEventDto: CreateEventDto,
    meta: {
      ip: string;
      ua: string;
    },
  ) {
    const geo = await this.geoService.geo(meta.ip);
    const parsed = uaParser(meta.ua);

    const device: 'Mobile' | 'Tablet' | 'Desktop' =
      parsed.device.type === 'mobile'
        ? 'Mobile'
        : parsed.device.type === 'tablet'
        ? 'Tablet'
        : 'Desktop';

    const utm: {
      utmSource?: string | null;
      utmMedium?: string | null;
      utmCampaign?: string | null;
      utmTerm?: string | null;
      utmContent?: string | null;
      source?: string | null;
      ref?: string | null;
    } = {};

    let url: URL;

    try {
      if (createEventDto.h.endsWith('/')) {
        url = new URL(createEventDto.h.slice(0, -1));
      } else {
        url = new URL(createEventDto.h);
      }
    } catch (error) {
      console.error('Failed to parse URL', error);
      return;
    }

    const searchParams = new URLSearchParams(url.search);

    utm.utmSource = searchParams.get('utm_source');
    utm.utmMedium = searchParams.get('utm_medium');
    utm.utmCampaign = searchParams.get('utm_campaign');
    utm.utmTerm = searchParams.get('utm_term');
    utm.utmContent = searchParams.get('utm_content');
    utm.source = searchParams.get('source');
    utm.ref = searchParams.get('ref');

    return this.dbService.event.create({
      data: {
        uniqueVisitorId: this.createUniqueVisitorId(
          createEventDto.d.toLowerCase(),
          meta.ip,
          meta.ua,
        ),
        type: createEventDto.n,
        ua: meta.ua,
        href: url.href,
        referrer: createEventDto.r,
        referrerUrl: createEventDto.r,
        country: geo?.country,
        countryCode: geo?.countryCode,
        city: geo?.city,
        region: geo?.regionName,
        latitude: geo?.lat.toString(),
        longitude: geo?.lon.toString(),
        browser: parsed.browser.name,
        browserVersion: parsed.browser.version,
        engine: parsed.engine.name,
        engineVersion: parsed.engine.version,
        os: parsed.os.name,
        osVersion: parsed.os.version,
        device,
        deviceVendor: parsed.device.vendor,
        deviceModel: parsed.device.model,
        cpuArchitecture: parsed.cpu.architecture,
        bot: isbot(meta.ua),
        ...utm,
        domain: {
          connect: {
            name: createEventDto.d.toLowerCase(),
          },
        },
      },
    });
  }

  count(data: Prisma.EventCountArgs) {
    return this.dbService.event.count(data);
  }

  async timeseries(domain: Domain, filters: FilterEventsDto) {
    const { to, from } = getTimes(filters);

    // console.time('timeseries:db');

    const eventsData = await this.findAll({
      where: {
        domainId: domain.id,
        sessionId: {
          not: null,
        },
        createdAt: {
          gte: from,
          lte: to,
        },
        ...buildFilters(domain.name, filters),
        bot: false,
      },
      select: {
        sessionId: true,
        createdAt: true,
        type: true,
        uniqueVisitorId: true,
      },
    });

    // console.timeEnd('timeseries:db');

    // console.time('timeseries:processing');

    // number of data points on chart (12 for year, 7 for week. dynamic for month)
    const dataPoints =
      filters.period === 'm'
        ? dayjs(from).daysInMonth()
        : dayjs(to).diff(
            from,
            periodIntervalMapping[filters.period as Period],
          ) + 1;

    const eventsInPeriod: {
      date: Date;
      views: number;
      uniqueVisitors: number;
      sessions: number;
      viewsPerSession: number;
      bounceRate: number;
    }[] = [];

    for (let i = 0; i < dataPoints; i++) {
      const date = dayjs
        .utc(to)
        .subtract(i, periodIntervalMapping[filters.period as Period])
        .startOf(periodIntervalMapping[filters.period as Period])
        .toDate();

      const eventsForInterval = eventsData.filter((event) =>
        dayjs(event.createdAt).isSame(
          date,
          periodIntervalMapping[filters.period as Period],
        ),
      );

      const sessionEventCount: Record<string, number> = {};

      for (let i = 0; i < eventsForInterval.length; i++) {
        const id = eventsForInterval[i].sessionId;
        const count = sessionEventCount[id] || 0;

        sessionEventCount[id] = count + 1;
      }

      const sessions = new Set(
        eventsForInterval.map((event) => event.sessionId),
      ).size;

      const views = eventsForInterval.filter(
        (event) => event.type === EventType.PAGE_VIEW,
      ).length;

      let viewsPerSession = 0;
      let bounceRate = 0;

      if (sessions > 0 && views > 0) {
        viewsPerSession = views / sessions;

        bounceRate =
          objectKeys(sessionEventCount).filter(
            (key) => sessionEventCount[key] === 1,
          ).length / sessions;
      }

      let uniqueVisitors = 0;

      if (eventsForInterval.some((event) => event.uniqueVisitorId)) {
        uniqueVisitors = new Set(
          eventsForInterval.map((event) => event.uniqueVisitorId),
        ).size;
      }

      eventsInPeriod.push({
        date,
        views,
        uniqueVisitors,
        sessions,
        viewsPerSession,
        bounceRate,
      });
    }

    // console.timeEnd('timeseries:processing');

    return eventsInPeriod.reverse();
  }

  async getAllReferrersInPeriod(domain: Domain, filters: FilterEventsDto) {
    const { to, from } = getTimes(filters);

    // console.time('getAllReferrersInPeriod');

    const events: {
      label: string;
      value: number;
      href: string | null;
    }[] = [];

    if (filters.referrer !== 'Direct / None') {
      const eventsByReferrer = await this.dbService.event.groupBy({
        by: ['referrer'],
        where: {
          domainId: domain.id,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...buildFilters(domain.name, filters),
          bot: false,
        },
        _count: {
          referrer: true,
        },
        orderBy: {
          _count: {
            referrer: 'desc',
          },
        },
      });

      for (const event of eventsByReferrer) {
        // TODO: handle android-app referrers
        if (event.referrer === null || !event.referrer.startsWith('https://')) {
          continue;
        }

        const value = event._count.referrer;
        const referrerDomain = new URL(event.referrer).hostname
          .split('.')
          .slice(-2)
          .join('.');

        if (referrers[referrerDomain]) {
          if (events.find((v) => v.label === referrers[referrerDomain])) {
            events.find((v) => v.label === referrers[referrerDomain]).value +=
              value;
            continue;
          }

          events.push({
            label: referrers[referrerDomain],
            value,
            href: new URL(event.referrer).origin,
          });
        } else {
          if (
            events.find((v) => v.label === new URL(event.referrer).hostname)
          ) {
            events.find(
              (v) => v.label === new URL(event.referrer).hostname,
            ).value += value;
            continue;
          }

          events.push({
            label: new URL(event.referrer).hostname,
            value,
            href: new URL(event.referrer).origin,
          });
        }
      }
    }

    if (!('referrer' in filters) || filters.referrer === 'Direct / None') {
      const eventCountWithoutReferrer = await this.dbService.event.count({
        where: {
          domainId: domain.id,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...buildFilters(domain.name, {
            ...filters,
            referrer: 'Direct / None',
          }),
          bot: false,
        },
      });

      if (eventCountWithoutReferrer > 0) {
        events.push({
          label: 'Direct / None',
          value: eventCountWithoutReferrer,
          href: null,
        });
      }
    }

    // console.timeEnd('getAllReferrersInPeriod');

    return events.sort((a, b) => b.value - a.value);
  }

  async getAllPagesInPeriod(domain: Domain, filters: FilterEventsDto) {
    const { to, from } = getTimes(filters);

    // console.time('getAllPagesInPeriod');

    const eventsByPage = await this.dbService.event.groupBy({
      by: ['href'],
      where: {
        domainId: domain.id,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...buildFilters(domain.name, filters),
        bot: false,
      },
      _count: {
        href: true,
      },
      orderBy: {
        _count: {
          href: 'desc',
        },
      },
    });

    // console.timeEnd('getAllPagesInPeriod');

    return eventsByPage
      .reduce((acc, event) => {
        const pathname = new URL(event.href).pathname;

        if (acc.find((v) => v.label === pathname)) {
          acc.find((v) => v.label === pathname).value += event._count.href;
          return acc;
        }

        acc.push({
          label: pathname,
          value: event._count.href,
        });

        return acc;
      }, [])
      .sort((a, b) => b.value - a.value);
  }

  async getAllCountriesInPeriod(domain: Domain, filters: FilterEventsDto) {
    const { to, from } = getTimes(filters);

    // console.time('getAllCountriesInPeriod');

    const eventsByCountry = await this.dbService.event.groupBy({
      by: ['country', 'countryCode'],
      where: {
        domainId: domain.id,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...buildFilters(domain.name, filters),
        bot: false,
      },
      _count: {
        country: true,
      },
      orderBy: {
        _count: {
          country: 'desc',
        },
      },
    });

    // console.timeEnd('getAllCountriesInPeriod');

    return eventsByCountry
      .filter((event) => event.country !== null)
      .map((event) => ({
        label: event.country,
        value: event._count.country,
        extra: {
          countryCode: event.countryCode,
        },
      }));
  }

  async getAllRegionsInPeriod(domain: Domain, filters: FilterEventsDto) {
    const { to, from } = getTimes(filters);

    // console.time('getAllRegionsInPeriod');

    const eventsByRegion = await this.dbService.event.groupBy({
      by: ['region', 'countryCode', 'country'],
      where: {
        domainId: domain.id,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...buildFilters(domain.name, filters),
        bot: false,
      },
      _count: {
        region: true,
      },
      orderBy: {
        _count: {
          region: 'desc',
        },
      },
    });

    // console.timeEnd('getAllRegionsInPeriod');

    return eventsByRegion
      .filter((event) => event.region !== null)
      .map((event) => ({
        label: event.region,
        value: event._count.region,
        extra: {
          countryCode: event.countryCode,
          country: event.country,
        },
      }));
  }

  async getAllCitiesInPeriod(domain: Domain, filters: FilterEventsDto) {
    const { to, from } = getTimes(filters);

    // console.time('getAllCitiesInPeriod');

    const eventsByCity = await this.dbService.event.groupBy({
      by: ['city', 'countryCode', 'country', 'region'],
      where: {
        domainId: domain.id,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...buildFilters(domain.name, filters),
        bot: false,
      },
      _count: {
        city: true,
      },
      orderBy: {
        _count: {
          city: 'desc',
        },
      },
    });

    // console.timeEnd('getAllCitiesInPeriod');

    return eventsByCity
      .filter((event) => event.city !== null)
      .map((event) => ({
        label: event.city,
        value: event._count.city,
        extra: {
          countryCode: event.countryCode,
          country: event.country,
          region: event.region,
        },
      }));
  }

  async getAllOsInPeriod(domain: Domain, filters: FilterEventsDto) {
    const { to, from } = getTimes(filters);

    // console.time('getAllOsInPeriod');

    const eventsByOs = await this.dbService.event.groupBy({
      by: ['os'],
      where: {
        domainId: domain.id,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...buildFilters(domain.name, filters),
        bot: false,
      },
      _count: {
        os: true,
      },
      orderBy: {
        _count: {
          os: 'desc',
        },
      },
    });

    // console.timeEnd('getAllOsInPeriod');

    return eventsByOs
      .filter((event) => event.os !== null)
      .map((event) => ({
        label: event.os,
        value: event._count.os,
      }));
  }

  async getAllBrowsersInPeriod(domain: Domain, filters: FilterEventsDto) {
    const { to, from } = getTimes(filters);

    // console.time('getAllBrowsersInPeriod');

    const eventsByBrowser = await this.dbService.event.groupBy({
      by: ['browser'],
      where: {
        domainId: domain.id,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...buildFilters(domain.name, filters),
        bot: false,
      },
      _count: {
        browser: true,
      },
      orderBy: {
        _count: {
          browser: 'desc',
        },
      },
    });

    // console.timeEnd('getAllBrowsersInPeriod');

    return eventsByBrowser
      .filter((event) => event.browser !== null)
      .map((event) => ({
        label: event.browser,
        value: event._count.browser,
      }));
  }

  async getAllDevicesInPeriod(domain: Domain, filters: FilterEventsDto) {
    const { to, from } = getTimes(filters);

    // console.time('getAllDevicesInPeriod');

    const eventsByDevice = await this.dbService.event.groupBy({
      by: ['device'],
      where: {
        domainId: domain.id,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...buildFilters(domain.name, filters),
        bot: false,
      },
      _count: {
        device: true,
      },
      orderBy: {
        _count: {
          device: 'desc',
        },
      },
    });

    // console.timeEnd('getAllDevicesInPeriod');

    return eventsByDevice
      .filter((event) => event.device !== null)
      .map((event) => ({
        label: event.device,
        value: event._count.device,
      }));
  }

  async getLiveVisitors(domainId: string) {
    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: dayjs().subtract(1, 'minute').toDate(),
        },
      },
      distinct: ['uniqueVisitorId'],
    });

    return events.length;
  }

  async getAllEventsForUser(userId: string) {
    const userDomain = await this.dbService.userDomain.findMany({
      where: {
        userId,
        role: DomainRole.OWNER,
      },
    });

    let count = 0;

    for (const domain of userDomain) {
      count += await this.dbService.event.count({
        where: {
          domainId: domain.domainId,
          createdAt: {
            gte: dayjs().startOf('month').toDate(),
            lte: dayjs().endOf('month').toDate(),
          },
        },
      });
    }

    return count;
  }

  async getUsageForUser(userId: string) {
    const userDomain = await this.dbService.userDomain.findMany({
      where: {
        userId,
        role: DomainRole.OWNER,
      },
      select: {
        domainId: true,
        domain: {
          select: {
            name: true,
          },
        },
      },
    });

    let usage = 0;
    const usageByDomain: {
      domain: string;
      usage: number;
      offset?: number;
    }[] = [];

    for (const domain of userDomain) {
      const events = await this.dbService.event.count({
        where: {
          domainId: domain.domainId,
          createdAt: {
            gte: dayjs.utc().startOf('month').toDate(),
            lte: dayjs.utc().endOf('month').toDate(),
          },
        },
      });

      usageByDomain.push({
        domain: domain.domain.name,
        usage: events,
      });

      usage += events;
    }

    usageByDomain.sort((a, b) => b.usage - a.usage);

    for (let i = 0; i < usageByDomain.length; i++) {
      usageByDomain[i].offset = usageByDomain.reduce(
        (acc, v, index) => (index < i ? acc + v.usage : acc),
        0,
      );
    }

    return {
      usage,
      usageByDomain,
    };
  }

  findAll(data: Prisma.EventFindManyArgs) {
    return this.dbService.event.findMany(data);
  }

  findUnique(data: Prisma.EventFindUniqueArgs) {
    return this.dbService.event.findUnique(data);
  }

  findFirst(data: Prisma.EventFindFirstArgs) {
    return this.dbService.event.findFirst(data);
  }

  update(data: Prisma.EventUpdateArgs) {
    return this.dbService.event.update(data);
  }

  remove(data: Prisma.EventDeleteArgs) {
    return this.dbService.event.delete(data);
  }

  private createUniqueVisitorId(domain: string, ip: string, ua: string) {
    // TODO: Replace with a generated salt rotated daily
    const salt = dayjs().format('YYYY-MM-DD');

    return createHmac('sha256', salt)
      .update(`${domain}-${ip}-${ua}`)
      .digest('hex');
  }
}
