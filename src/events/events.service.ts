import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { EventType, Prisma } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import * as geoip from 'geoip-lite';
import * as uaParser from 'ua-parser-js';
import * as dayjs from 'dayjs';
import { createHmac, randomBytes } from 'crypto';
import { FilterEventsDto, Period } from './dto/filter-events.dto';
import { objectKeys } from 'src/utils/object-keys';
import { TinybirdService } from 'src/tinybird/tinybird.service';
import { GeoService } from 'src/geo/geo.service';
import { detectBot } from 'src/utils/middleware/detect-bot';

const periodIntervalMapping: Record<Period, dayjs.UnitTypeShort> = {
  '1h': 'm',
  '1d': 'h',
  '7d': 'd',
  '30d': 'd',
  '1y': 'm',
  // May need to be adjusted
  all: 'd',
};

@Injectable()
export class EventsService {
  constructor(
    private readonly dbService: DbService,
    private readonly geoService: GeoService,
    private readonly tbService: TinybirdService,
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

    // const country = new Intl.DisplayNames(['en'], { type: 'region' }).of(
    //   geo?.country,
    // );

    const utm: {
      utmSource?: string | null;
      utmMedium?: string | null;
      utmCampaign?: string | null;
    } = {};

    const domain = await this.dbService.domain.findUnique({
      where: {
        name: createEventDto.d.toLowerCase(),
      },
    });

    try {
      const url = new URL(createEventDto.h);
      const searchParams = new URLSearchParams(url.search);

      utm.utmSource = searchParams.get('utm_source');
      utm.utmMedium = searchParams.get('utm_medium');
      utm.utmCampaign = searchParams.get('utm_campaign');
    } catch (error) {
      console.error('Failed to parse URL', error);
    }

    try {
      const res = await this.tbService.injectEvents({
        timestamp: dayjs().toISOString().replace('T', ' ').replace('Z', ''),
        event_id: randomBytes(16).toString('hex'),
        domain_id: domain.id,
        unique_visitor_id: this.createUniqueVisitorId(
          createEventDto.d.toLowerCase(),
          meta.ip,
          meta.ua,
        ),
        type: createEventDto.n,
        href: createEventDto.h,
        country: geo.country || 'Unknown',
        country_code: geo.countryCode || 'Unknown',
        city: geo.city || 'Unknown',
        region: geo.regionName || 'Unknown',
        latitude: geo.lat?.toString() || 'Unknown',
        longitude: geo.lon?.toString() || 'Unknown',
        ua: meta.ua,
        browser: parsed.browser.name || 'Unknown',
        browser_version: parsed.browser.version || 'Unknown',
        engine: parsed.engine.name || 'Unknown',
        engine_version: parsed.engine.version || 'Unknown',
        os: parsed.os.name || 'Unknown',
        os_version: parsed.os.version || 'Unknown',
        device: parsed.device.type || 'Unknown',
        device_vendor: parsed.device.vendor || 'Unknown',
        device_model: parsed.device.model || 'Unknown',
        cpu_architecture: parsed.cpu.architecture || 'Unknown',
        bot: detectBot(meta.ua) ? 1 : 0,
        referrer: createEventDto.r || 'None',
        referrer_url: createEventDto.r || 'None',
        utm_source: utm.utmSource || 'None',
        utm_medium: utm.utmMedium || 'None',
        utm_campaign: utm.utmCampaign || 'None',
      });

      console.log(
        {
          timestamp: dayjs().toISOString().replace('T', ' ').replace('Z', ''),
          event_id: randomBytes(16).toString('hex'),
          domain_id: domain.id,
          unique_visitor_id: this.createUniqueVisitorId(
            createEventDto.d.toLowerCase(),
            meta.ip,
            meta.ua,
          ),
          type: createEventDto.n,
          href: createEventDto.h,
          country: geo.country || 'Unknown',
          country_code: geo.countryCode || 'Unknown',
          city: geo.city || 'Unknown',
          region: geo.regionName || 'Unknown',
          latitude: geo.lat?.toString() || 'Unknown',
          longitude: geo.lon?.toString() || 'Unknown',
          ua: meta.ua,
          browser: parsed.browser.name || 'Unknown',
          browser_version: parsed.browser.version || 'Unknown',
          engine: parsed.engine.name || 'Unknown',
          engine_version: parsed.engine.version || 'Unknown',
          os: parsed.os.name || 'Unknown',
          os_version: parsed.os.version || 'Unknown',
          device: parsed.device.type || 'Unknown',
          device_vendor: parsed.device.vendor || 'Unknown',
          device_model: parsed.device.model || 'Unknown',
          cpu_architecture: parsed.cpu.architecture || 'Unknown',
          bot: detectBot(meta.ua) ? 1 : 0,
          referrer: createEventDto.r || 'None',
          referrer_url: createEventDto.r || 'None',
          utm_source: utm.utmSource || 'None',
          utm_medium: utm.utmMedium || 'None',
          utm_campaign: utm.utmCampaign || 'None',
        },
        res,
      );
    } catch (error) {
      console.log('Failed to inject event into Tinybird', error, {
        timestamp: dayjs().toISOString().replace('T', ' ').replace('Z', ''),
        event_id: randomBytes(16).toString('hex'),
        domain_id: domain.id,
        unique_visitor_id: this.createUniqueVisitorId(
          createEventDto.d.toLowerCase(),
          meta.ip,
          meta.ua,
        ),
        type: createEventDto.n,
        href: createEventDto.h,
        country: geo.country || 'Unknown',
        country_code: geo.countryCode || 'Unknown',
        city: geo.city || 'Unknown',
        region: geo.regionName || 'Unknown',
        latitude: geo.lat?.toString() || 'Unknown',
        longitude: geo.lon?.toString() || 'Unknown',
        ua: meta.ua,
        browser: parsed.browser.name || 'Unknown',
        browser_version: parsed.browser.version || 'Unknown',
        engine: parsed.engine.name || 'Unknown',
        engine_version: parsed.engine.version || 'Unknown',
        os: parsed.os.name || 'Unknown',
        os_version: parsed.os.version || 'Unknown',
        device: parsed.device.type || 'Unknown',
        device_vendor: parsed.device.vendor || 'Unknown',
        device_model: parsed.device.model || 'Unknown',
        cpu_architecture: parsed.cpu.architecture || 'Unknown',
        bot: detectBot(meta.ua) ? 1 : 0,
        referrer: createEventDto.r || 'None',
        referrer_url: createEventDto.r || 'None',
        utm_source: utm.utmSource || 'None',
        utm_medium: utm.utmMedium || 'None',
        utm_campaign: utm.utmCampaign || 'None',
      });
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
        country: geo?.country,
        countryCode: geo?.countryCode,
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

  async timeseries(domainId: string, filters: FilterEventsDto) {
    let to: Date;
    let from: Date;

    if (filters.period === 'all') {
      to = new Date();
      from = new Date('2024-02-29');
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      to = dayjs(filters.date).toDate();
      from = dayjs(filters.date).subtract(+amount, period).toDate();
    }

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
            filters.referrer === 'Direct / None'
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

    const dataPoints =
      dayjs(to).diff(from, periodIntervalMapping[filters.period as Period]) + 1;

    const eventsInPeriod: {
      date: Date;
      views: number;
      uniqueVisitors: number;
      sessions: number;
      viewsPerSession: number;
      bounceRate: number;
    }[] = [];

    for (let i = 0; i < dataPoints; i++) {
      const date = dayjs(to)
        .subtract(i, periodIntervalMapping[filters.period as Period])
        .toDate();
      const eventsForInterval = eventsData.filter((event) =>
        dayjs(event.createdAt).isSame(
          date,
          periodIntervalMapping[filters.period as Period],
        ),
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

    return eventsInPeriod.reverse();
  }

  async getAllReferrersInPeriod(domainId: string, filters: FilterEventsDto) {
    let to: Date;
    let from: Date;

    if (filters.period === 'all') {
      to = new Date();
      from = new Date('2024-02-29');
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      to = dayjs(filters.date).toDate();
      from = dayjs(filters.date).subtract(+amount, period).toDate();
    }

    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(filters?.referrer && {
          referrer:
            filters.referrer === 'Direct / None'
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

    const referrers = events.reduce((acc, event) => {
      if (!event.referrer) {
        return acc.set('Direct / None', (acc.get('Direct / None') || 0) + 1);
      } else if (event.referrer.includes('linkedin')) {
        return acc.set('LinkedIn', (acc.get('LinkedIn') || 0) + 1);
      }

      return acc.set(
        new URL(event.referrer).origin,
        (acc.get(new URL(event.referrer).origin) || 0) + 1,
      );
    }, new Map());

    return [...referrers.entries()]
      .map(([key, value]) => ({
        label: key,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }

  async getAllPagesInPeriod(domainId: string, filters: FilterEventsDto) {
    let to: Date;
    let from: Date;

    if (filters.period === 'all') {
      to = new Date();
      from = new Date('2024-02-29');
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      to = dayjs(filters.date).toDate();
      from = dayjs(filters.date).subtract(+amount, period).toDate();
    }

    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(filters?.referrer && {
          referrer:
            filters.referrer === 'Direct / None'
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

    const pages = events.reduce(
      (acc, event) =>
        acc.set(
          new URL(event.href).pathname,
          (acc.get(new URL(event.href).pathname) || 0) + 1,
        ),
      new Map(),
    );

    return [...pages.entries()]
      .map(([key, value]) => ({
        label: key,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }

  async getAllCountriesInPeriod(domainId: string, filters: FilterEventsDto) {
    let to: Date;
    let from: Date;

    if (filters.period === 'all') {
      to = new Date();
      from = new Date('2024-02-29');
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      to = dayjs(filters.date).toDate();
      from = dayjs(filters.date).subtract(+amount, period).toDate();
    }

    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(filters?.referrer && {
          referrer:
            filters.referrer === 'Direct / None'
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

    const countries = events.reduce(
      (acc, event) => acc.set(event.country, (acc.get(event.country) || 0) + 1),
      new Map(),
    );

    return [...countries.entries()]
      .map(([key, value]) => ({
        label: key,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }

  async getAllOsInPeriod(domainId: string, filters: FilterEventsDto) {
    let to: Date;
    let from: Date;

    if (filters.period === 'all') {
      to = new Date();
      from = new Date('2024-02-29');
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      to = dayjs(filters.date).toDate();
      from = dayjs(filters.date).subtract(+amount, period).toDate();
    }

    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(filters?.referrer && {
          referrer:
            filters.referrer === 'Direct / None'
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

    const os = events.reduce(
      (acc, event) => acc.set(event.os, (acc.get(event.os) || 0) + 1),
      new Map(),
    );

    return [...os.entries()]
      .map(([key, value]) => ({
        label: key,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }

  async getAllBrowsersInPeriod(domainId: string, filters: FilterEventsDto) {
    let to: Date;
    let from: Date;

    if (filters.period === 'all') {
      to = new Date();
      from = new Date('2024-02-29');
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      to = dayjs(filters.date).toDate();
      from = dayjs(filters.date).subtract(+amount, period).toDate();
    }

    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(filters?.referrer && {
          referrer:
            filters.referrer === 'Direct / None'
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

    const browsers = events.reduce(
      (acc, event) => acc.set(event.browser, (acc.get(event.browser) || 0) + 1),
      new Map(),
    );

    return [...browsers.entries()]
      .map(([key, value]) => ({
        label: key,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }

  getLiveVisitors(domainId: string) {
    return this.dbService.event.count({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: dayjs().subtract(1, 'minute').toDate(),
        },
      },
    });
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

  private backwardsCompatibleResponse<T>(
    pipeResponse: T & { data: Record<string, string | number>[] },
    k: string,
  ) {
    const data = pipeResponse.data;

    return data.map((entry) => ({
      label: entry[k] as string,
      value: +entry['count'],
    }));
  }

  async getTimeseries(domainId: string, filters: FilterEventsDto) {
    let from: Date;
    let to: Date;

    if (filters.period === 'all') {
      from = new Date('2024-02-29');
      to = new Date();
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      from = dayjs(filters.date).subtract(+amount, period).toDate();
      to = dayjs(filters.date).toDate();
    }

    const dayjsUnit = periodIntervalMapping[filters.period as Period];

    let granularity: 'minute' | 'hour' | 'day' | 'month';

    switch (dayjsUnit) {
      case 'm':
        granularity = 'minute';
        break;
      case 'h':
        granularity = 'hour';
        break;
      case 'd':
        granularity = 'day';
        break;
      case 'M':
        granularity = 'month';
        break;
      default:
        granularity = 'day';
        break;
    }

    const pipeFilters = {
      domain_id: domainId,
      start: from.toISOString().replace('T', ' ').replace('Z', ''),
      end: to.toISOString().replace('T', ' ').replace('Z', ''),
      granularity,
    };

    const data = await this.tbService.getTimeSeriesPipe(pipeFilters);

    return data.data;
  }

  async getReferrers(domainId: string, filters: FilterEventsDto) {
    let from: Date;
    let to: Date;

    if (filters.period === 'all') {
      from = new Date('2024-02-29');
      to = new Date();
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      from = dayjs(filters.date).subtract(+amount, period).toDate();
      to = dayjs(filters.date).toDate();
    }

    const pipeFilters = {
      domain_id: domainId,
      date_from: from.toISOString().replace('T', ' ').replace('Z', ''),
      date_to: to.toISOString().replace('T', ' ').replace('Z', ''),
    };

    const data = await this.tbService.getReferrerPipe(pipeFilters);

    return this.backwardsCompatibleResponse(data, 'referrer');
  }

  async getPages(domainId: string, filters: FilterEventsDto) {
    let from: Date;
    let to: Date;

    if (filters.period === 'all') {
      from = new Date('2024-02-29');
      to = new Date();
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      from = dayjs(filters.date).subtract(+amount, period).toDate();
      to = dayjs(filters.date).toDate();
    }

    const pipeFilters = {
      domain_id: domainId,
      date_from: from.toISOString().replace('T', ' ').replace('Z', ''),
      date_to: to.toISOString().replace('T', ' ').replace('Z', ''),
    };

    const data = await this.tbService.getPagePipe(pipeFilters);

    return this.backwardsCompatibleResponse(data, 'href');
  }

  async getCountries(domainId: string, filters: FilterEventsDto) {
    let from: Date;
    let to: Date;

    if (filters.period === 'all') {
      from = new Date('2024-02-29');
      to = new Date();
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      from = dayjs(filters.date).subtract(+amount, period).toDate();
      to = dayjs(filters.date).toDate();
    }

    const pipeFilters = {
      domain_id: domainId,
      date_from: from.toISOString().replace('T', ' ').replace('Z', ''),
      date_to: to.toISOString().replace('T', ' ').replace('Z', ''),
    };

    const data = await this.tbService.getCountryPipe(pipeFilters);

    return this.backwardsCompatibleResponse(data, 'country');
  }

  async getBrowsers(domainId: string, filters: FilterEventsDto) {
    let from: Date;
    let to: Date;

    if (filters.period === 'all') {
      from = new Date('2024-02-29');
      to = new Date();
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      from = dayjs(filters.date).subtract(+amount, period).toDate();
      to = dayjs(filters.date).toDate();
    }

    const pipeFilters = {
      domain_id: domainId,
      date_from: from.toISOString().replace('T', ' ').replace('Z', ''),
      date_to: to.toISOString().replace('T', ' ').replace('Z', ''),
    };

    const data = await this.tbService.getBrowserPipe(pipeFilters);

    return this.backwardsCompatibleResponse(data, 'browser');
  }

  async getOs(domainId: string, filters: FilterEventsDto) {
    let from: Date;
    let to: Date;

    if (filters.period === 'all') {
      from = new Date('2024-02-29');
      to = new Date();
    } else {
      const [amount, period] = filters.period.match(/\d+|\D+/g) as [
        string,
        dayjs.UnitTypeShort,
      ];

      from = dayjs(filters.date).subtract(+amount, period).toDate();
      to = dayjs(filters.date).toDate();
    }

    const pipeFilters = {
      domain_id: domainId,
      date_from: from.toISOString().replace('T', ' ').replace('Z', ''),
      date_to: to.toISOString().replace('T', ' ').replace('Z', ''),
    };

    const data = await this.tbService.getOsPipe(pipeFilters);

    return this.backwardsCompatibleResponse(data, 'os');
  }

  private createUniqueVisitorId(domain: string, ip: string, ua: string) {
    // TODO: Replace with a generated salt rotated daily
    const salt = dayjs().format('YYYY-MM-DD');

    return createHmac('sha256', salt)
      .update(`${domain}-${ip}-${ua}`)
      .digest('hex');
  }
}
