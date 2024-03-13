import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { EventType, Prisma } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import * as geoip from 'geoip-lite';
import * as uaParser from 'ua-parser-js';
import * as dayjs from 'dayjs';
import { createHmac } from 'crypto';
import { FilterEventsDto } from './dto/filter-events.dto';

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

  async getAllEventsInPeriod(
    name: string,
    filters: FilterEventsDto,
    userId?: string,
  ) {
    const from = dayjs(filters.date).subtract(1, filters.period).toDate();
    const to = dayjs(filters.date).toDate();

    const eventsData = await this.findAll({
      where: {
        domain: {
          name,
          ...(userId && {
            users: {
              some: {
                userId,
              },
            },
          }),
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
    }[] = [];

    for (let i = 0; i < dataPoints; i++) {
      const date = dayjs(to).subtract(i, filters.interval).toDate();
      const eventsForInterval = eventsData.filter((event) =>
        dayjs(event.createdAt).isSame(date, filters.interval),
      );

      const views = eventsForInterval.filter(
        (event) => event.type === EventType.PAGE_VIEW,
      ).length;

      // Return early if there are no events for the day
      if (eventsForInterval.every((event) => !event.uniqueVisitorId)) {
        eventsInPeriod.push({ date, views, uniqueVisitors: 0 });

        continue;
      }

      const uniqueVisitors = new Set(
        eventsForInterval.map((event) => event.uniqueVisitorId),
      ).size;

      eventsInPeriod.push({ date, views, uniqueVisitors });
    }

    const referrers = eventsData.reduce((acc, event) => {
      if (event.referrer) {
        return acc.set(
          new URL(event.referrer).origin,
          (acc.get(new URL(event.referrer).origin) || 0) + 1,
        );
      } else {
        return acc.set('Direct / None', (acc.get('Direct / None') || 0) + 1);
      }
    }, new Map());

    const pages = eventsData.reduce(
      (acc, event) =>
        acc.set(
          new URL(event.href).pathname,
          (acc.get(new URL(event.href).pathname) || 0) + 1,
        ),
      new Map(),
    );

    const countries = eventsData.reduce(
      (acc, event) => acc.set(event.country, (acc.get(event.country) || 0) + 1),
      new Map(),
    );

    const os = eventsData.reduce(
      (acc, event) => acc.set(event.os, (acc.get(event.os) || 0) + 1),
      new Map(),
    );

    const browsers = eventsData.reduce(
      (acc, event) => acc.set(event.browser, (acc.get(event.browser) || 0) + 1),
      new Map(),
    );

    return {
      eventsInPeriod: eventsInPeriod.reverse(),
      referrers: [...referrers.entries()]
        .map(([key, value]) => ({
          label: key,
          value,
        }))
        .sort((a, b) => b.value - a.value),
      pages: [...pages.entries()]
        .map(([key, value]) => ({
          label: key,
          value,
        }))
        .sort((a, b) => b.value - a.value),
      countries: [...countries.entries()]
        .map(([key, value]) => ({
          label: key,
          value,
        }))
        .sort((a, b) => b.value - a.value),
      os: [...os.entries()]
        .map(([key, value]) => ({
          label: key,
          value,
        }))
        .sort((a, b) => b.value - a.value),
      browsers: [...browsers.entries()]
        .map(([key, value]) => ({
          label: key,
          value,
        }))
        .sort((a, b) => b.value - a.value),
    };
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
