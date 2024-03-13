import { Injectable } from '@nestjs/common';
import { Event, EventType } from '@prisma/client';
import * as dayjs from 'dayjs';
import { DbService } from 'src/db/db.service';

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
          gte: dayjs().subtract(30, 'minute').toDate(),
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
        },
      });
    }
  }
}
