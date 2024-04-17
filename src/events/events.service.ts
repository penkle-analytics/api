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

    return eventsInPeriod.reverse();
  }

  async getAllReferrersInPeriod(domainId: string, filters: FilterEventsDto) {
    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
          lte: dayjs(filters.date).toDate(),
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
    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
          lte: dayjs(filters.date).toDate(),
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
    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
          lte: dayjs(filters.date).toDate(),
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
    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
          lte: dayjs(filters.date).toDate(),
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
    const events = await this.dbService.event.findMany({
      where: {
        domain: {
          id: domainId,
        },
        createdAt: {
          gte: dayjs(filters.date).subtract(1, filters.period).toDate(),
          lte: dayjs(filters.date).toDate(),
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

  private createUniqueVisitorId(domain: string, ip: string, ua: string) {
    // TODO: Replace with a generated salt rotated daily
    const salt = dayjs().format('YYYY-MM-DD');

    return createHmac('sha256', salt)
      .update(`${domain}-${ip}-${ua}`)
      .digest('hex');
  }
}
