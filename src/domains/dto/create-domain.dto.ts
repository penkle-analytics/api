import { Transform } from 'class-transformer';
import { IsFQDN, IsNotEmpty } from 'class-validator';

export class CreateDomainDto {
  @IsFQDN()
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  name!: string;
}
