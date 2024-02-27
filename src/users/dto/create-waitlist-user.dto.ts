import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateWaitlistUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
