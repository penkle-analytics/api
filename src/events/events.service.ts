import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { EventType, Prisma } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import * as geoip from 'geoip-lite';
import * as uaParser from 'ua-parser-js';
import * as dayjs from 'dayjs';
import { createHmac } from 'crypto';
import { FilterEventsDto } from './dto/filter-events.dto';
import { objectKeys } from 'src/utils/object-keys';
import { referrers } from 'src/data/referrers';

@Injectable()
export class EventsService {
  constructor(private readonly dbService: DbService) {}

  create(
    createEventDto: CreateEventDto,
    meta: {
      ip: string;
      ua: string;
    },
  ) {
    const geo = geoip.lookup(meta.ip);
    const parsed = uaParser(meta.ua);

    const device: 'Mobile' | 'Tablet' | 'Desktop' =
      parsed.device.type === 'mobile'
        ? 'Mobile'
        : parsed.device.type === 'tablet'
        ? 'Tablet'
        : 'Desktop';

    const country = new Intl.DisplayNames(['en'], { type: 'region' }).of(
      geo?.country,
    );

    const utm: {
      utmSource?: string | null;
      utmMedium?: string | null;
      utmCampaign?: string | null;
    } = {};

    try {
      const url = new URL(createEventDto.h);
      const searchParams = new URLSearchParams(url.search);

      utm.utmSource = searchParams.get('utm_source');
      utm.utmMedium = searchParams.get('utm_medium');
      utm.utmCampaign = searchParams.get('utm_campaign');
    } catch (error) {
      console.error('Failed to parse URL', error);
    }

    return this.dbService.event.create({
      data: {
        uniqueVisitorId: this.createUniqueVisitorId(
          createEventDto.d.toLowerCase(),
          meta.ip,
          meta.ua,
        ),
        type: createEventDto.n,
        href: createEventDto.h,
        referrer: createEventDto.r,
        country,
        countryCode: geo?.country,
        browser: parsed.browser.name,
        os: parsed.os.name,
        device,
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

  async getAllEventsInPeriod(domainId: string, filters: FilterEventsDto) {
    const from = dayjs(filters.date).subtract(1, filters.period).toDate();
    const to = dayjs(filters.date).toDate();

    // console.time('getAllEventsInPeriod');

    const eventsData = await this.findAll({
      where: {
        domainId,
        sessionId: {
          not: null,
        },
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(filters?.referrer && {
          referrer:
            filters.referrer === 'Direct / None' || filters.referrer === 'null'
              ? null
              : {
                  startsWith: filters.referrer,
                },
        }),
        ...(filters?.page && { href: { contains: filters.page } }),
        ...(filters?.country && { country: filters.country }),
        ...(filters?.os && { os: filters.os }),
        ...(filters?.browser && { browser: filters.browser }),
      },
    });

    const dataPoints = dayjs(to).diff(from, filters.interval) + 1;

    const eventsInPeriod: {
      date: Date;
      views: number;
      uniqueVisitors: number;
      sessions: number;
      viewsPerSession: number;
      bounceRate: number;
    }[] = [];

    for (let i = 0; i < dataPoints; i++) {
      const date = dayjs(to).subtract(i, filters.interval).toDate();
      const eventsForInterval = eventsData.filter((event) =>
        dayjs(event.createdAt).isSame(date, filters.interval),
      );

      let sessionEventCount: Record<string, number> = {};

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

    // console.timeEnd('getAllEventsInPeriod');

    return eventsInPeriod.reverse();
  }

  async getAllReferrersInPeriod(domainId: string, filters: FilterEventsDto) {
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
          domainId,
          createdAt: {
            gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
            lte: dayjs(filters.date).toDate(),
          },
          ...(filters?.referrer && {
            referrer:
              filters.referrer === 'Direct / None' ||
              filters.referrer === 'null'
                ? null
                : {
                    startsWith: filters.referrer,
                  },
          }),
          ...(filters?.page && { href: { contains: filters.page } }),
          ...(filters?.country && { country: filters.country }),
          ...(filters?.os && { os: filters.os }),
          ...(filters?.browser && { browser: filters.browser }),
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
        if (event.referrer === null) {
          continue;
        }

        const value = event._count.referrer;
        const referrerDomain = new URL(event.referrer).hostname
          .split('.')
          .slice(-2)
          .join('.');

        if (event.referrer.includes('linkedin')) {
          if (events.find((v) => v.label === 'LinkedIn')) {
            events.find((v) => v.label === 'LinkedIn').value += value;
            continue;
          }

          events.push({
            label: 'LinkedIn',
            value,
            href: 'https://linkedin.com',
          });
        } else if (referrers[referrerDomain]) {
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
          domainId,
          createdAt: {
            gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
            lte: dayjs(filters.date).toDate(),
          },
          referrer: null,
          ...(filters?.page && { href: { contains: filters.page } }),
          ...(filters?.country && { country: filters.country }),
          ...(filters?.os && { os: filters.os }),
          ...(filters?.browser && { browser: filters.browser }),
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

  async getAllPagesInPeriod(domainId: string, filters: FilterEventsDto) {
    // console.time('getAllPagesInPeriod');

    const eventsByPage = await this.dbService.event.groupBy({
      by: ['href'],
      where: {
        domainId,
        createdAt: {
          gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
          lte: dayjs(filters.date).toDate(),
        },
        ...(filters?.referrer && {
          referrer:
            filters.referrer === 'Direct / None' || filters.referrer === 'null'
              ? null
              : {
                  startsWith: filters.referrer,
                },
        }),
        ...(filters?.page && { href: { contains: filters.page } }),
        ...(filters?.country && { country: filters.country }),
        ...(filters?.os && { os: filters.os }),
        ...(filters?.browser && { browser: filters.browser }),
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

  async getAllCountriesInPeriod(domainId: string, filters: FilterEventsDto) {
    // console.time('getAllCountriesInPeriod');

    const eventsByCountry = await this.dbService.event.groupBy({
      by: ['country'],
      where: {
        domainId,
        createdAt: {
          gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
          lte: dayjs(filters.date).toDate(),
        },
        ...(filters?.referrer && {
          referrer:
            filters.referrer === 'Direct / None' || filters.referrer === 'null'
              ? null
              : {
                  startsWith: filters.referrer,
                },
        }),
        ...(filters?.page && { href: { contains: filters.page } }),
        ...(filters?.country && { country: filters.country }),
        ...(filters?.os && { os: filters.os }),
        ...(filters?.browser && { browser: filters.browser }),
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

    return eventsByCountry.map((event) => ({
      label: event.country,
      value: event._count.country,
    }));
  }

  async getAllOsInPeriod(domainId: string, filters: FilterEventsDto) {
    // console.time('getAllOsInPeriod');

    const eventsByOs = await this.dbService.event.groupBy({
      by: ['os'],
      where: {
        domainId,
        createdAt: {
          gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
          lte: dayjs(filters.date).toDate(),
        },
        ...(filters?.referrer && {
          referrer:
            filters.referrer === 'Direct / None' || filters.referrer === 'null'
              ? null
              : {
                  startsWith: filters.referrer,
                },
        }),
        ...(filters?.page && { href: { contains: filters.page } }),
        ...(filters?.country && { country: filters.country }),
        ...(filters?.os && { os: filters.os }),
        ...(filters?.browser && { browser: filters.browser }),
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

    return eventsByOs.map((event) => ({
      label: event.os,
      value: event._count.os,
    }));
  }

  async getAllBrowsersInPeriod(domainId: string, filters: FilterEventsDto) {
    // console.time('getAllBrowsersInPeriod');

    const eventsByBrowser = await this.dbService.event.groupBy({
      by: ['browser'],
      where: {
        domainId,
        createdAt: {
          gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
          lte: dayjs(filters.date).toDate(),
        },
        ...(filters?.referrer && {
          referrer:
            filters.referrer === 'Direct / None' || filters.referrer === 'null'
              ? null
              : {
                  startsWith: filters.referrer,
                },
        }),
        ...(filters?.page && { href: { contains: filters.page } }),
        ...(filters?.country && { country: filters.country }),
        ...(filters?.os && { os: filters.os }),
        ...(filters?.browser && { browser: filters.browser }),
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

    return eventsByBrowser.map((event) => ({
      label: event.browser,
      value: event._count.browser,
    }));
  }

  getLiveVisitors(domainId: string) {
    return this.dbService.event
      .findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: dayjs().subtract(1, 'minute').toDate(),
        },
      },
        distinct: ['uniqueVisitorId'],
      })
      .then((events) => events.length);
  }

  findAll(data: Prisma.EventFindManyArgs) {
    return this.dbService.event.findMany(data);
  }

  findUnique(data: Prisma.EventFindUniqueArgs) {
    return this.dbService.event.findUnique(data);
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
