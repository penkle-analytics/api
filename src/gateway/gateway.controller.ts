import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { LoginDto } from 'src/auth/dto/login.dto';
import { SignupDto } from 'src/auth/dto/signup.dto';
import { CreateWaitlistUserDto } from 'src/users/dto/create-waitlist-user.dto';
import { UsersService } from 'src/users/users.service';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('/')
export class GatewayController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('/auth/me')
  async me(@Req() req: Request) {
    const { password, ...user } = await this.usersService.findUnique({
      where: { id: req['user'].sub },
    });

    return user;
  }

  @HttpCode(HttpStatus.OK)
  @Post('/auth/login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authEntity = await this.authService.login(body);

    if (!authEntity) {
      return null;
    }

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie('penkle-token', authEntity.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    });

    return { accessToken: authEntity.accessToken };
  }

  // @HttpCode(HttpStatus.OK)
  // @Post('/auth/signup')
  // async signup(@Body() body: SignupDto) {
  //   return this.authService.signup(body);
  // }

  @HttpCode(HttpStatus.OK)
  @Post('/auth/waitlist')
  async waitlist(@Body() body: CreateWaitlistUserDto) {
    return this.usersService.createWaitlist(body);
  }
}
