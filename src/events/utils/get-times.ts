import { FilterEventsDto, Period } from '../dto/filter-events.dto';
import * as dayjs from 'dayjs';
import { periodIntervalMapping } from '../events.service';

function extractAmountAndPeriod(filters: FilterEventsDto) {
  const [amount, period] = filters.period.match(/\d+|\D+/g) as [
    string,
    dayjs.UnitTypeShort,
  ];

  const from = dayjs
    .utc(filters.date)
    .add(1, periodIntervalMapping[filters.period])
    .startOf(periodIntervalMapping[filters.period])
    .subtract(+amount, period)
    .toDate();
  const to = dayjs
    .utc(filters.date)
    .endOf(periodIntervalMapping[filters.period])
    .toDate();

  return {
    to,
    from,
  };
}

export function getTimes(filters: FilterEventsDto) {
  if (filters.period === 'd') {
    return {
      from: dayjs.utc(filters.date).startOf('day').toDate(),
      to: dayjs.utc(filters.date).endOf('day').toDate(),
    };
  } else if (filters.period === 'm') {
    return {
      from: dayjs.utc(filters.date).startOf('month').toDate(),
      to: dayjs.utc(filters.date).endOf('month').toDate(),
    };
  } else if (filters.period === 'y') {
    return {
      from: dayjs.utc(filters.date).startOf('year').toDate(),
      to: dayjs.utc(filters.date).endOf('year').toDate(),
    };
  }

  return extractAmountAndPeriod(filters);
}
