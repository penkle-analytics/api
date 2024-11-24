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
import { CreateWaitlistUserDto } from 'src/users/dto/create-waitlist-user.dto';
import { UsersService } from 'src/users/users.service';
import type { Response, Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { ConfigService } from '@nestjs/config';
import * as dayjs from 'dayjs';
import { ResetDto } from 'src/auth/dto/reset.dto';
import { SignupDto } from 'src/auth/dto/signup.dto';
import { DomainsService } from 'src/domains/domains.service';
import { DbService } from 'src/db/db.service';

declare global {
  namespace Express {
    interface User {
      sub: string;
    }
  }
}

@Controller('/')
export class GatewayAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly dbService: DbService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('/auth/me')
  async me(@Req() req: Request) {
    const user = await this.usersService.findUnique({
      where: { id: req['user'].sub },
    });

    delete user.password;

    await this.usersService.update({
      where: { id: req['user'].sub },
      data: {
        lastSeenAt: dayjs().toDate(),
      },
    });

    const domains = await this.dbService.userDomain.findMany({
      where: { userId: user.id, role: 'OWNER' },
      include: {
        domain: true,
      },
    });

    return { ...user, domains: domains.map((domain) => domain.domain) };
  }

  @HttpCode(HttpStatus.OK)
  @Post('/auth/login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authEntity = await this.authService.login(loginDto);

    if (!authEntity) {
      return null;
    }

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie('penkle-token', authEntity.accessToken, {
      httpOnly: true,
      secure: isProd,
      domain: isProd ? '.penkle.com' : undefined,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    });

    return { accessToken: authEntity.accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('/auth/signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authEntity = await this.authService.signup(signupDto);

    if (!authEntity) {
      return null;
    }

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie('penkle-token', authEntity.accessToken, {
      httpOnly: true,
      secure: isProd,
      domain: isProd ? '.penkle.com' : undefined,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    });

    return { accessToken: authEntity.accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('/auth/forgot')
  async forgot(@Body() body: { email: string }) {
    await this.authService.forgot(body.email);

    return {
      status: 'ok',
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Post('/auth/reset')
  async reset(
    @Res({ passthrough: true }) response: Response,
    @Req() req: Request,
    @Body() body: ResetDto,
  ) {
    const authEntity = await this.authService.reset(req.user.sub, body);

    if (!authEntity) {
      return null;
    }

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie('penkle-token', authEntity.accessToken, {
      httpOnly: true,
      secure: isProd,
      domain: isProd ? '.penkle.com' : undefined,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    });

    return { accessToken: authEntity.accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Post('/auth/logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('penkle-token');

    return {
      status: 'ok',
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('/auth/waitlist')
  async waitlist(@Body() createWaitlistUserDto: CreateWaitlistUserDto) {
    console.log('POST /auth/waitlist', { createWaitlistUserDto });

    return this.usersService.createWaitlistUser(createWaitlistUserDto);
  }
}
