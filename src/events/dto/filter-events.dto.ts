import { IsEnum, IsOptional, IsString } from 'class-validator';

const period = ['day', 'week', 'month'] as const;

export type Period = (typeof period)[number];

const interval = ['hour', 'day', 'week', 'month'] as const;

export type Interval = (typeof interval)[number];

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

  @IsEnum(interval)
  @IsOptional()
  interval?: Interval;

  @IsString()
  @IsOptional()
  date?: string;
}
