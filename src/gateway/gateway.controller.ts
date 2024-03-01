import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import type { Response, Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { ConfigService } from '@nestjs/config';
import { CreateDomainDto } from 'src/domains/dto/create-domain.dto';
import { DomainsService } from 'src/domains/domains.service';
import { CreateEventDto } from 'src/events/dto/create-event.dto';
import { EventsService } from 'src/events/events.service';
import * as requestIp from 'request-ip';
import * as geoip from 'geoip-lite';
import * as uaParser from 'ua-parser-js';
import { isbot } from 'isbot';
import * as dayjs from 'dayjs';

declare global {
  namespace Express {
    interface User {
      sub: string;
    }
  }
}

@Controller('/')
export class GatewayController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly domainsService: DomainsService,
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
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    console.log('POST /auth/login', { loginDto });

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

  // @HttpCode(HttpStatus.OK)
  // @Post('/auth/signup')
  // async signup(@Body() body: SignupDto) {
  //   return this.authService.signup(body);
  // }

  @HttpCode(HttpStatus.OK)
  @Post('/auth/waitlist')
  async waitlist(@Body() createWaitlistUserDto: CreateWaitlistUserDto) {
    console.log('POST /auth/waitlist', { createWaitlistUserDto });

    return this.usersService.createWaitlistUser(createWaitlistUserDto);
  }

  @UseGuards(AuthGuard)
  @Post('/domains')
  async createDomain(
    @Body() createDomainDto: CreateDomainDto,
    @Req() req: Request,
  ) {
    console.log('POST /domains', { createDomainDto });

    return this.domainsService.create(req['user'].sub, createDomainDto);
  }

  @UseGuards(AuthGuard)
  @Get('/domains')
  findAllDomains(@Req() req: Request) {
    return this.domainsService.findAll({
      where: {
        users: {
          some: {
            userId: req['user'].sub,
          },
        },
      },
    });
  }

  @UseGuards(AuthGuard)
  @Get('/domains/:name')
  async findOneDomain(@Param('name') name: string, @Req() req: Request) {
    const events = await this.eventsService.findAll({
      where: {
        domain: {
          name,
          users: { some: { userId: req['user'].sub } },
        },
        createdAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days
        },
      },
    });

    const eventsInWeek = [];

    for (let i = 0; i < 7; i++) {
      const date = dayjs().subtract(i, 'day').startOf('day').toDate();
      const count = events.filter((event) =>
        dayjs(event.createdAt).isSame(date, 'day'),
      ).length;
      eventsInWeek.push({ date, value: count });
    }

    const domain = await this.domainsService.findUnique({
      // TODO: Make sure this only returns the domain if it belongs to the user
      where: {
        name,
        users: { some: { userId: req['user'].sub } },
      },
    });

    // make sure the last 7 days are returned
    return {
      ...domain,
      events,
      eventsInWeek: eventsInWeek.reverse(),
    };
  }

  @Post('/events')
  create(@Req() request: Request, @Body() createEventDto: CreateEventDto) {
    const ua = request.headers['user-agent'];

    if (isbot(ua)) {
      throw new BadRequestException('Bot detected');
    }

    const host = new URL(createEventDto.h).host;

    if (host !== createEventDto.d) {
      throw new BadRequestException('Host and domain do not match');
    }

    const ip = requestIp.getClientIp(request);
    const geo = geoip.lookup(ip);

    const parsed = uaParser(ua);

    console.log('POST /events', {
      createEventDto,
      geo,
      parsed,
    });

    return this.eventsService.create(createEventDto, {
      geo,
      ua: parsed,
    });
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateDomainDto: UpdateDomainDto) {
  //   return this.domainsService.update(+id, updateDomainDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.domainsService.remove(+id);
  // }
}
