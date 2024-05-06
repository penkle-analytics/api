import { Prisma } from '@prisma/client';
import { FilterEventsDto } from '../dto/filter-events.dto';

export function buildFilters(domain: string, filters: FilterEventsDto) {
  const where: Prisma.EventWhereInput = {};

  if (filters.referrer === 'Direct / None') {
    where.referrer = null;
  } else if (filters.referrer) {
    where.referrer = {
      startsWith: filters.referrer,
    };
  }

  if (filters.page) {
    const url = new URL('https://' + domain + filters.page);

    where.href = url.href;
  }

  if (filters.city) {
    where.city = filters.city;
  } else if (filters.region) {
    where.region = filters.region;
  } else if (filters.country) {
    where.country = filters.country;
  }

  if (filters.browser) {
    where.browser = filters.browser;
  }

  if (filters.os) {
    where.os = filters.os;
  }

  if (filters.device) {
    where.device = filters.device;
  }

  return where;
}
