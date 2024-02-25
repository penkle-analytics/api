import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateEventDto {
  // Event name
  @IsEnum(['pageview'])
  @IsNotEmpty()
  n!: string;

  // Current Href
  @IsString()
  @IsNotEmpty()
  h!: string;

  // Domain
  @IsString()
  d: string;

  // Referrer
  @IsString()
  r: string;
}
