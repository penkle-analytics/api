import { IsOptional, IsString } from 'class-validator';

export class FilterEventsDto {
  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  to?: string;

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
}
