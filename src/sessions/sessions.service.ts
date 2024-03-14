import { Injectable } from '@nestjs/common';
import { Event, EventType } from '@prisma/client';
import * as dayjs from 'dayjs';
import { DbService } from 'src/db/db.service';
import { FilterEventsDto } from 'src/events/dto/filter-events.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly dbService: DbService) {}

  async handleSession(event: Event) {
    if (event.type !== EventType.PAGE_VIEW) {
      return;
    }

    const { uniqueVisitorId } = event;

    const session = await this.dbService.session.findFirst({
      where: {
        uniqueVisitorId,
        createdAt: {
          gte: dayjs().subtract(1, 'minute').toDate(),
        },
      },
    });

    if (session) {
      await this.dbService.session.update({
        where: {
          id: session.id,
        },
        data: {
          events: {
            connect: {
              id: event.id,
            },
          },
        },
      });
    } else {
      await this.dbService.session.create({
        data: {
          uniqueVisitorId,
          events: {
            connect: {
              id: event.id,
            },
          },
          domain: {
            connect: {
              id: event.domainId,
            },
          },
        },
      });
    }
  }

  async linkDomainWithSession() {
    const sessions = await this.dbService.session.findMany({
      where: {
        domainId: null,
      },
      include: {
        events: true,
      },
    });

    for await (const session of sessions) {
      const domainId = session.events[0].domainId;

      await this.dbService.session.update({
        where: {
          id: session.id,
        },
        data: {
          domain: {
            connect: {
              id: domainId,
            },
          },
        },
      });
    }
  }

  async getAllSessionsInPeriod(domainId: string, filters: FilterEventsDto) {
    const from = dayjs(filters.date).subtract(1, filters.period).toDate();
    const to = dayjs(filters.date).toDate();

    // const sessions = await this.dbService.session.findMany({
    //   where: {
    //     domainId,
    //     createdAt: {
    //       gte: from,
    //       lte: to,
    //     },
    //   },
    //   include: {
    //     events: true,
    //   },
    // });

    // const pagesPerSession = sessions.reduce((acc, session) => {
    //   const pageViews = session.events.filter(
    //     (event) => event.type === EventType.PAGE_VIEW,
    //   );
    //   const uniquePages = new Set(pageViews.map((event) => event.href)).size;
    //   return acc.set(session.id, uniquePages);
    // }, new Map());

    // const bounceRate =
    //   sessions.filter((session) => {
    //     const pageViews = session.events.filter(
    //       (event) => event.type === EventType.PAGE_VIEW,
    //     );
    //     return pageViews.length === 1;
    //   }).length / sessions.length;

    // return {
    //   sessions: sessions.length,
    //   pagesPerSession: [...pagesPerSession.entries()]
    //     .map(([key, value]) => ({
    //       sessionId: key,
    //       value,
    //     }))
    //     .sort((a, b) => b.value - a.value),
    //   bounceRate,
    // };

    const sessionsInPeriod = await this.dbService.session.findMany({
      where: {
        domainId,
        createdAt: {
          gte: from,
          lte: to,
        },
        events: {
          some: {
            type: EventType.PAGE_VIEW,
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
        },
      },
      include: {
        events: true,
      },
    });

    const dataPoints = dayjs(to).diff(from, filters.interval) + 1;

    const eventsInPeriod: {
      date: Date;
      sessions: number;
      viewsPerSession: number;
      bounceRate: number;
    }[] = [];

    for (let i = 0; i < dataPoints; i++) {
      const date = dayjs(to).subtract(i, filters.interval).toDate();
      const sessionsForInterval = sessionsInPeriod.filter((session) =>
        dayjs(session.createdAt).isSame(date, filters.interval),
      );

      const views = sessionsForInterval.reduce(
        (acc, session) =>
          acc +
          session.events.filter((event) => event.type === EventType.PAGE_VIEW)
            .length,
        0,
      );

      const sessions = sessionsForInterval.length;

      let viewsPerSession = 0;
      let bounceRate = 0;

      if (sessions > 0) {
        viewsPerSession = views / sessions;

        bounceRate =
          sessionsForInterval.filter((session) => {
            const pageViews = session.events.filter(
              (event) => event.type === EventType.PAGE_VIEW,
            );
            return pageViews.length === 1;
          }).length / sessions;
      }

      eventsInPeriod.push({ date, sessions, viewsPerSession, bounceRate });
    }

    return eventsInPeriod;
  }
}
