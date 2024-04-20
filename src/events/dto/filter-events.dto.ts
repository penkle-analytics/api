import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

const period = ['1h', '1d', '7d', '30d', '1y', 'all'] as const;

export type Period = (typeof period)[number];

// const interval = ['hour', 'day', 'week', 'month'] as const;

// export type Interval = (typeof interval)[number];

export class FilterEventsDto {
  @IsString()
  @IsOptional()
  referrer?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  browser?: string;

  @IsString()
  @IsOptional()
  os?: string;

  @IsEnum(period)
  @IsOptional()
  period?: Period;

  // @IsEnum(interval)
  // @IsOptional()
  // interval?: Interval;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  new?: string;
}
