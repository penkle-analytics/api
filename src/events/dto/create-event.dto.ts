import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  // Event name
  @IsString()
  @IsNotEmpty()
  n!: string;

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
