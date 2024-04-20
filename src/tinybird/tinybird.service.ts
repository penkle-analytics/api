import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as z from 'zod';
import { Tinybird } from '@chronark/zod-bird';
import { Config } from 'src/config/config';

const queryFiltersSchema = z.object({
  domain_id: z.string(),
  date_from: z.string(),
  date_to: z.string(),
  href: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  browser: z.string().optional(),
  browser_version: z.string().optional(),
  engine: z.string().optional(),
  engine_version: z.string().optional(),
  os: z.string().optional(),
  os_version: z.string().optional(),
  device: z.string().optional(),
  device_vendor: z.string().optional(),
  device_model: z.string().optional(),
  cpu_architecture: z.string().optional(),
  bot: z.number().optional(),
  referrer: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
});

const timeseriesQueryFilterSchema = queryFiltersSchema
  .extend({
    start: z.string(),
    end: z.string(),
    granularity: z.enum(['minute', 'hour', 'day', 'month']),
  })
  .omit({ date_from: true, date_to: true });

/**
 * event:
 * timestamp: timestamp.toISOString(),
      event_id: crypto.randomBytes(16).toString("hex"),
      domain_id: domain.id,
      unique_visitor_id: createUniqueVisitorId(domain.id, ip, ua),
      type: "PAGE_VIEW",
      href: randomHref(domain.url),
      country: geo.country || "Unknown",
      country_code: geo.countryCode || "Unknown",
      city: geo.city || "Unknown",
      region: geo.region || "Unknown",
      latitude: geo.lat?.toString() || "Unknown",
      longitude: geo.lon?.toString() || "Unknown",
      ua: ua,
      browser: parsed.browser.name || "Unknown",
      browser_version: parsed.browser.version || "Unknown",
      engine: parsed.engine.name || "Unknown",
      engine_version: parsed.engine.version || "Unknown",
      os: parsed.os.name || "Unknown",
      os_version: parsed.os.version || "Unknown",
      device: parsed.device.type || "Unknown",
      device_vendor: parsed.device.vendor || "Unknown",
      device_model: parsed.device.model || "Unknown",
      cpu_architecture: parsed.cpu.architecture || "Unknown",
      bot: Math.random() > 0.95 ? 1 : 0,
      referrer: faker.internet.url(),
      referrer_url: faker.internet.url(),
      utm_source: faker.word.noun(),
      utm_medium: faker.word.noun(),
      utm_campaign: faker.word.noun(),
 */

const eventSchema = z.object({
  timestamp: z.string(),
  event_id: z.string(),
  domain_id: z.string(),
  unique_visitor_id: z.string(),
  type: z.string(),
  href: z.string(),
  country: z.string(),
  country_code: z.string(),
  city: z.string(),
  region: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  ua: z.string(),
  browser: z.string(),
  browser_version: z.string(),
  engine: z.string(),
  engine_version: z.string(),
  os: z.string(),
  os_version: z.string(),
  device: z.string(),
  device_vendor: z.string(),
  device_model: z.string(),
  cpu_architecture: z.string(),
  bot: z.number(),
  referrer: z.string(),
  referrer_url: z.string(),
  utm_source: z.string(),
  utm_medium: z.string(),
  utm_campaign: z.string(),
});

@Injectable()
export class TinybirdService {
  tb: Tinybird;

  constructor(private readonly configService: ConfigService) {
    this.tb = new Tinybird({
      baseUrl: 'https://api.eu-central-1.aws.tinybird.co',
      token: this.configService.get<Config['tinyBirdKey']>('tinyBirdKey'),
    });
  }

  async injectEvents(
    events: z.infer<typeof eventSchema> | z.infer<typeof eventSchema>[],
  ) {
    // const injest = this.tb.buildIngestEndpoint({
    //   datasource: 'events',
    //   event: eventSchema,
    // });

    // return injest(events);

    const res = await fetch(
      'https://api.eu-central-1.aws.tinybird.co/v0/events?name=events',
      {
        method: 'POST',
        body: JSON.stringify(events),
        headers: {
          Authorization:
            'Bearer p.eyJ1IjogImEyZGE2Nzc3LWY4MWItNDdlNS1iMmEwLTE5ZGExMWViYTE3ZSIsICJpZCI6ICI5MGMyNDVlMy03MTkxLTRkOTYtYmNiZi04OTgzM2RlYjk3NDAiLCAiaG9zdCI6ICJhd3MtZXUtY2VudHJhbC0xIn0.rnwtCQSy8TGqjipVfxLGbhDcqgJWlmfgjp8R5l639vk',
        },
      },
    );

    return res.json();
  }

  getTimeSeriesPipe(filters: z.infer<typeof timeseriesQueryFilterSchema>) {
    const pipe = this.tb.buildPipe({
      pipe: 'timeseries',
      parameters: timeseriesQueryFilterSchema,
      data: z.object({
        date: z.coerce.date(),
        clicks: z.number(),
      }),
    });

    return pipe(filters);
  }

  getReferrerPipe(filters: z.infer<typeof queryFiltersSchema>) {
    const pipe = this.tb.buildPipe({
      pipe: 'referrer',
      parameters: queryFiltersSchema,
      data: z.object({
        referrer: z.string(),
        count: z.number(),
      }),
    });

    return pipe(filters);
  }

  getPagePipe(filters: z.infer<typeof queryFiltersSchema>) {
    const pipe = this.tb.buildPipe({
      pipe: 'page',
      parameters: queryFiltersSchema,
      data: z.object({
        href: z.string(),
        count: z.number(),
      }),
    });

    return pipe(filters);
  }

  getCountryPipe(filters: z.infer<typeof queryFiltersSchema>) {
    const pipe = this.tb.buildPipe({
      pipe: 'country',
      parameters: queryFiltersSchema,
      data: z.object({
        country: z.string(),
        count: z.number(),
      }),
    });

    return pipe(filters);
  }

  getBrowserPipe(filters: z.infer<typeof queryFiltersSchema>) {
    const pipe = this.tb.buildPipe({
      pipe: 'browser',
      parameters: queryFiltersSchema,
      data: z.object({
        browser: z.string(),
        count: z.number(),
      }),
    });

    return pipe(filters);
  }

  getOsPipe(filters: z.infer<typeof queryFiltersSchema>) {
    const pipe = this.tb.buildPipe({
      pipe: 'os',
      parameters: queryFiltersSchema,
      data: z.object({
        os: z.string(),
        count: z.number(),
      }),
    });

    return pipe(filters);
  }
}
