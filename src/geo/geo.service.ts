import { Injectable } from '@nestjs/common';
import * as z from 'zod';

const geoSchema = z.object({
  as: z.string(),
  city: z.string(),
  country: z.string(),
  countryCode: z.string(),
  isp: z.string(),
  lat: z.number(),
  lon: z.number(),
  org: z.string(),
  query: z.string(),
  region: z.string(),
  regionName: z.string(),
  status: z.string(),
  timezone: z.string(),
  zip: z.string(),
});

@Injectable()
export class GeoService {
  async geo(ip: string) {
    const url = `http://ip-api.com/json/${ip}`;
    const res = await fetch(url);

    if (!res.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `An error occurred fetching '${url}'\n${await res.text()}`,
        );
      } else if (process.env.NODE_ENV === 'production') {
        await fetch(`https://hooks.zapier.com/hooks/catch/18624223/3n0pkre/`, {
          method: 'POST',
        });
      }

      throw new Error('An error occurred');
    }

    const json = await res.json();

    console.log(json);

    if (geoSchema.safeParse(json).success === false) {
      throw new Error('An error occurred');
    }

    return geoSchema.parse(json) as z.output<typeof geoSchema>;
  }
}
