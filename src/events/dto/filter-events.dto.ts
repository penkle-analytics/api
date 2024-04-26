import { IsEnum, IsOptional, IsString } from 'class-validator';

const period = ['d', '7d', '30d', 'm', 'y'] as const;

export type Period = (typeof period)[number];

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

  @IsString()
  @IsOptional()
  date?: string;
}
