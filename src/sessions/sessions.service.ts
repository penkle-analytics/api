import { Inject, Injectable } from '@nestjs/common';
import { Event, EventType } from '@prisma/client';
import * as dayjs from 'dayjs';
import { and, eq, gte, isNotNull, lte } from 'drizzle-orm';
import { DbAsyncProvider, Db } from 'src/db/db.provider';
import { event, session } from 'src/db/schema';
import { FilterEventsDto } from 'src/events/dto/filter-events.dto';

@Injectable()
export class SessionsService {
  constructor(@Inject(DbAsyncProvider) private readonly db: Db) {}

  async handleSession({
    id,
    type,
    uniqueVisitorId,
    createdAt,
    domainId,
  }: Event) {
    if (type !== EventType.PAGE_VIEW || !uniqueVisitorId) {
      return;
    }

    const sessionRecord = await this.db.query.session.findFirst({
      where: (fields) => {
        return and(
          eq(fields.uniqueVisitorId, uniqueVisitorId),
          gte(
            fields.createdAt,
            dayjs(createdAt).subtract(30, 'minute').toISOString(),
          ),
        );
      },
    });

    if (sessionRecord) {
      await this.db
        .update(event)
        .set({
          sessionId: sessionRecord.id,
          updatedAt: dayjs().toISOString(),
        })
        .where(eq(event.id, id));
    } else {
      await this.db.transaction(async (tx) => {
        const [{ id: sessionId }] = await tx
          .insert(session)
          .values({
            uniqueVisitorId,
            createdAt: dayjs(createdAt).toISOString(),
            updatedAt: dayjs().toISOString(),
            domainId,
          })
          .returning({
            id: session.id,
          });

        tx.update(event)
          .set({
            sessionId,
            updatedAt: dayjs().toISOString(),
          })
          .where(eq(event.id, id));
      });
    }
  }

  async getAllSessionsInPeriod(domainId: string, filters: FilterEventsDto) {
    const from = dayjs(filters.date).subtract(1, filters.period).toDate();
    const to = dayjs(filters.date).toDate();

    const eventsWithSessionForPeriod = await this.db.query.event.findMany({
      columns: {
        id: true,
        createdAt: true,
        sessionId: true,
      },
      where: (fields) => {
        return and(
          // Old records did not track uniqueVisitorId,
          // hence why the session can be null
          isNotNull(fields.sessionId),
          eq(fields.domainId, domainId),
          gte(fields.createdAt, from.toISOString()),
          lte(fields.createdAt, to.toISOString()),
          filters?.referrer &&
            (filters.referrer === 'Direct / None'
              ? eq(fields.referrer, null)
              : eq(fields.referrer, filters.referrer)),
          filters?.page && eq(fields.href, filters.page),
          filters?.country && eq(fields.country, filters.country),
          filters?.os && eq(fields.os, filters.os),
          filters?.browser && eq(fields.browser, filters.browser),
        );
      },
      with: {
        session: {
          columns: {
            id: true,
            createdAt: true,
          },
        },
      },
    });

    const sessionsForSelectedPeriod = eventsWithSessionForPeriod.reduce(
      (acc, event) => {
        if (acc.every((session) => session.id !== event.session.id)) {
          acc.push(event.session);
        }

        return acc;
      },
      [] as {
        id: string;
        createdAt: string;
      }[],
    );

    const dataPoints = dayjs(to).diff(from, filters.interval);

    const eventsInPeriod: {
      date: Date;
      sessions: number;
      viewsPerSession: number;
      bounceRate: number;
    }[] = [];

    for (let i = 0; i < dataPoints; i++) {
      const date = dayjs(to).subtract(i, filters.interval).toDate();
      const sessionsForInterval = sessionsForSelectedPeriod.filter((session) =>
        dayjs(session.createdAt).isSame(date, filters.interval),
      );

      const views = eventsWithSessionForPeriod.length;

      const sessions = sessionsForInterval.length;

      let viewsPerSession = 0;
      let bounceRate = 0;

      if (sessions > 0) {
        viewsPerSession = views / sessions;

        const sessionsWithMoreThanOneEvent = sessionsForInterval.filter(
          (session) =>
            eventsWithSessionForPeriod.filter(
              (event) =>
                dayjs(event.createdAt).isSame(date, filters.interval) &&
                event.sessionId === session.id,
            ).length > 1,
        );

        bounceRate =
          (sessions - sessionsWithMoreThanOneEvent.length) / sessions;
      }

      eventsInPeriod.push({ date, sessions, viewsPerSession, bounceRate });
    }

    return eventsInPeriod;
  }
}
