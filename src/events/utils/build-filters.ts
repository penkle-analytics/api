import { Prisma } from '@prisma/client';
import { FilterEventsDto } from '../dto/filter-events.dto';

export function buildFilters(domain: string, filters: FilterEventsDto) {
  const where: Prisma.EventWhereInput = {};

  if (filters.referrer === 'null') {
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

  if (filters.country) {
    where.country = filters.country;
  }

  if (filters.browser) {
    where.browser = filters.browser;
  }

  if (filters.os) {
    where.os = filters.os;
  }

  return where;
}
