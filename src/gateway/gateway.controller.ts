import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { LoginDto } from 'src/auth/dto/login.dto';
import { SignupDto } from 'src/auth/dto/signup.dto';
import { CreateWaitlistUserDto } from 'src/users/dto/create-waitlist-user.dto';
import { UsersService } from 'src/users/users.service';

@Controller('/')
export class GatewayController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('/auth/login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('/auth/signup')
  async signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
  }

  @Post('/auth/waitlist')
  async waitlist(@Body() body: CreateWaitlistUserDto) {
    return this.usersService.createWaitlist(body);
  }
}
