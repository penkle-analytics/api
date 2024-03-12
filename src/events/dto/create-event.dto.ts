import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum EventName {
  PAGE_VIEW = 'PAGE_VIEW',
}

export class CreateEventDto {
  // Event name
  @IsEnum([EventName.PAGE_VIEW])
  @IsNotEmpty()
  n!: EventName;

  // Current Href
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  h!: string;

  // Domain
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  d!: string;

  // Referrer
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value.toLowerCase())
  r?: string;
}
