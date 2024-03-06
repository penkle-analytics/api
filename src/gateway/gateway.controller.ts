import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
import { CreateDomainDto } from 'src/domains/dto/create-domain.dto';
import { DomainsService } from 'src/domains/domains.service';
import { CreateEventDto } from 'src/events/dto/create-event.dto';
import { EventsService } from 'src/events/events.service';
import * as requestIp from 'request-ip';
import { isbot } from 'isbot';
import * as dayjs from 'dayjs';
import { EventType } from '@prisma/client';
import { FilterEventsDto } from 'src/events/dto/filter-events.dto';
import { ResetDto } from 'src/auth/dto/reset.dto';
import { SignupDto } from 'src/auth/dto/signup.dto';

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

  @HttpCode(HttpStatus.OK)
  @Post('/auth/signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    console.log('POST /auth/login', { signupDto });

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
  @UseGuards(AuthGuard)
  @Post('/auth/reset')
  async reset(@Req() req: Request, @Body() body: ResetDto) {
    return this.authService.reset(req.user.sub, body);
  }

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
  async findOneDomain(
    @Req() req: Request,
    @Param('name') name: string,
    @Query() query: FilterEventsDto,
  ) {
    query.period ||= 'week';
    query.interval ||= 'day';
    query.date ||= dayjs().toISOString();

    const from = dayjs(query.date).subtract(1, query.period).toDate();
    const to = dayjs(query.date).toDate();

    const eventsData = await this.eventsService.findAll({
      where: {
        domain: {
          name,
          users: { some: { userId: req['user'].sub } },
        },
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(query?.referrer && {
          referrer: query.referrer === 'Direct / None' ? null : query.referrer,
        }),
        ...(query?.page && { href: { contains: query.page } }),
        ...(query?.country && { country: query.country }),
        ...(query?.os && { os: query.os }),
        ...(query?.browser && { browser: query.browser }),
      },
    });

    const dataPoints = dayjs(to).diff(from, query.interval) + 1;

    const eventsInPeriod: {
      date: Date;
      views: number;
      uniqueVisitors: number;
    }[] = [];

    for (let i = 0; i < dataPoints; i++) {
      const date = dayjs(to).subtract(i, query.interval).toDate();
      const eventsForInterval = eventsData.filter((event) =>
        dayjs(event.createdAt).isSame(date, query.interval),
      );

      const views = eventsForInterval.filter(
        (event) => event.type === EventType.PAGE_VIEW,
      ).length;

      // Return early if there are no events for the day
      if (eventsForInterval.every((event) => !event.uniqueVisitorId)) {
        eventsInPeriod.push({ date, views, uniqueVisitors: 0 });

        continue;
      }

      const uniqueVisitors = new Set(
        eventsForInterval.map((event) => event.uniqueVisitorId),
      ).size;

      eventsInPeriod.push({ date, views, uniqueVisitors });
    }

    const countriesWithCount = eventsData.reduce(
      (acc, event) => acc.set(event.country, (acc.get(event.country) || 0) + 1),
      new Map(),
    );

    const routesWithCount = eventsData.reduce(
      (acc, event) =>
        acc.set(
          new URL(event.href).pathname,
          (acc.get(new URL(event.href).pathname) || 0) + 1,
        ),
      new Map(),
    );

    const osWithCount = eventsData.reduce(
      (acc, event) => acc.set(event.os, (acc.get(event.os) || 0) + 1),
      new Map(),
    );

    const browsersWithCount = eventsData.reduce(
      (acc, event) => acc.set(event.browser, (acc.get(event.browser) || 0) + 1),
      new Map(),
    );

    const referrersWithCount = eventsData.reduce((acc, event) => {
      if (event.referrer) {
        return acc.set(event.referrer, (acc.get(event.referrer) || 0) + 1);
      } else {
        return acc.set('Direct / None', (acc.get('Direct / None') || 0) + 1);
      }
    }, new Map());

    const domain = await this.domainsService.findUnique({
      // TODO: Make sure this only returns the domain if it belongs to the user
      where: {
        name,
        users: { some: { userId: req['user'].sub } },
      },
    });

    return {
      ...domain,
      events: eventsData,
      eventsInPeriod: eventsInPeriod.reverse(),
      countriesWithCount: Array.from(countriesWithCount)
        .map(([country, count]) => ({
          country,
          count,
        }))
        .sort((a, b) => b.count - a.count),
      routesWithCount: Array.from(routesWithCount)
        .map(([route, count]) => ({
          route,
          count,
        }))
        .sort((a, b) => b.count - a.count),
      osWithCount: Array.from(osWithCount)
        .map(([os, count]) => ({
          os,
          count,
        }))
        .sort((a, b) => b.count - a.count),
      browsersWithCount: Array.from(browsersWithCount)
        .map(([browser, count]) => ({
          browser,
          count,
        }))
        .sort((a, b) => b.count - a.count),
      referrersWithCount: Array.from(referrersWithCount)
        .map(([referrer, count]) => ({
          referrer,
          count,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  @Post('/events')
  async create(
    @Req() request: Request,
    @Body() createEventDto: CreateEventDto,
  ) {
    const events = await this.eventsService.findAll({
      where: {
        createdAt: {
          gte: dayjs().startOf('month').toDate(),
          lte: dayjs().endOf('month').toDate(),
        },
      },
    });

    if (events.length > 5000) {
      throw new BadRequestException('Monthly limit exceeded');
    }

    const ua = request.headers['user-agent'];

    if (isbot(ua)) {
      throw new BadRequestException('Bot detected');
    }

    const host = new URL(createEventDto.h).host;

    if (host !== createEventDto.d) {
      throw new BadRequestException('Host and domain do not match');
    }

    const ip = requestIp.getClientIp(request);

    console.log('POST /events', {
      createEventDto,
    });

    await this.eventsService.create(createEventDto, {
      ip,
      ua,
    });

    return 'ok';
  }

  @UseGuards(AuthGuard)
  @Get('/check/:domain')
  async checkDomain(@Req() req: Request, @Param('domain') domain: string) {
    const events = await this.eventsService.findAll({
      where: {
        domain: {
          name: domain,
          users: { some: { userId: req['user'].sub } },
        },
      },
    });

    if (events.length > 0) {
      return {
        domain,
        installed: true,
      };
    }

    return {
      domain,
      installed: false,
    };
  }
}
