import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { Prisma } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import type { Lookup } from 'geoip-lite';
import type { IResult } from 'ua-parser-js';

@Injectable()
export class EventsService {
  constructor(private readonly dbService: DbService) {}

  create(
    createEventDto: CreateEventDto,
    meta?: {
      geo: Lookup;
      ua: IResult;
    },
  ) {
    return this.dbService.event.create({
      data: {
        type: createEventDto.n,
        href: createEventDto.h,
        referrer: createEventDto.r,
        location: meta?.geo?.country,
        browser: meta?.ua.browser.name,
        os: meta?.ua.os.name,
        domain: {
          connect: {
            name: createEventDto.d,
          },
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
}
