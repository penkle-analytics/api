import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { Prisma } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import * as geoip from 'geoip-lite';
import * as uaParser from 'ua-parser-js';
import * as dayjs from 'dayjs';
import { createHmac } from 'crypto';

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
          createEventDto.d,
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
            name: createEventDto.d,
          },
        },
      },
    });
  }

  count(data: Prisma.EventCountArgs) {
    return this.dbService.event.count(data);
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
