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

    if (!uniqueVisitorId) {
      return;
    }

    const session = await this.dbService.session.findFirst({
      where: {
        uniqueVisitorId,
        createdAt: {
          gte: dayjs(event.createdAt).subtract(30, 'minute').toDate(),
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
          createdAt: event.createdAt,
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

  getSessionById(id: string) {
    return this.dbService.session.findUnique({
      where: {
        id,
      },
    });
  }
}
