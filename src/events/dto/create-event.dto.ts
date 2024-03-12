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
  h!: string;

  // Domain
  @IsString()
  @IsNotEmpty()
  d!: string;

  // Referrer
  @IsString()
  @IsOptional()
  r?: string;
}
