import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
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
import { CreateCheckoutSessionDto } from 'src/subscriptions/dto/create-checkout-session';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { CreateBillingPortalSessionDto } from 'src/subscriptions/dto/create-billing-portal-session.dto';
import { ChangeSubscriptionPlanDto } from 'src/subscriptions/dto/change-subscription-plan.dto';
import { FREE_PLAN_VIEW_LIMIT, plans } from 'src/config/stripe';
import { SessionsService } from 'src/sessions/sessions.service';
import { hasSubscribers } from 'diagnostics_channel';

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
    private readonly sessionsService: SessionsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('/auth/me')
  async me(@Req() req: Request) {
    const { password, ...user } = await this.usersService.findUnique({
      where: { id: req['user'].sub },
    });

    await this.usersService.update({
      where: { id: req['user'].sub },
      data: {
        lastSeenAt: dayjs().toDate(),
      },
    });

    return user;
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

  @Get('/domains/demo')
  async getDemoDomain(@Query() query: FilterEventsDto) {
    const name = 'penkle.com';

    query.period ||= 'week';
    query.interval ||= 'day';
    query.date ||= dayjs().toISOString();

    const domain = await this.domainsService.findUnique({
      // Make sure this only returns the domain if it belongs to the user
      where: {
        name,
      },
    });

    return {
      ...domain,
      hasExceededLimit: false,
    };
  }

  @Get('/domains/penkle.com/live-visitors')
  async getDemoLiveVisitors() {
    const name = 'penkle.com';

    const domain = await this.domainsService.findUnique({
      where: {
        name,
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    const liveVisitors = await this.eventsService.getLiveVisitors(domain.id);

    return {
      liveVisitors,
    };
  }

  @Get('/domains/penkle.com/timeseries')
  async getDemoTimeseries(@Query() query: FilterEventsDto) {
    const name = 'penkle.com';

    query.period ||= 'week';
    query.interval ||= 'day';
    query.date ||= dayjs().toISOString();

    const domain = await this.domainsService.findUnique({
      where: {
        name,
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return this.eventsService.getAllEventsInPeriod(domain.id, query);
  }

  @Get('/domains/demo/:type')
  async getDemoDomainInfo(
    @Param('type') type: string,
    @Query() query: FilterEventsDto,
  ) {
    const name = 'penkle.com';

    query.period ||= 'week';
    query.interval ||= 'day';
    query.date ||= dayjs().toISOString();

    const domain = await this.domainsService.findUnique({
      where: {
        name,
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    switch (type) {
      case 'referrers':
        return this.eventsService.getAllReferrersInPeriod(domain.id, query);
      case 'pages':
        return this.eventsService.getAllPagesInPeriod(domain.id, query);
      case 'countries':
        return this.eventsService.getAllCountriesInPeriod(domain.id, query);
      case 'os':
        return this.eventsService.getAllOsInPeriod(domain.id, query);
      case 'browsers':
        return this.eventsService.getAllBrowsersInPeriod(domain.id, query);
      default:
        throw new BadRequestException('Invalid type');
    }
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

    const domain = await this.domainsService.findUnique({
      // TODO: Make sure this only returns the domain if it belongs to the user
      where: {
        name,
        users: { some: { userId: req['user'].sub } },
      },
    });

    const eventsInMonth = await this.eventsService.count({
      where: {
        domain: {
          id: domain.id,
        },
        createdAt: {
          gte: dayjs().startOf('month').toDate(),
          lte: dayjs().endOf('month').toDate(),
        },
      },
    });

    const subscription =
      await this.subscriptionsService.findSubscriptionByDomain(domain.name);

    let maxViews = FREE_PLAN_VIEW_LIMIT;

    if (subscription) {
      maxViews = plans[subscription.subscriptionPlan].maxViews;
    }

    return {
      ...domain,
      hasExceededLimit: eventsInMonth >= maxViews,
    };
  }

  @UseGuards(AuthGuard)
  @Get('/domains/:name/live-visitors')
  async getLiveVisitors(@Req() req: Request, @Param('name') name: string) {
    const userDomains = await this.domainsService.getUserDomainsByUserId(
      req['user'].sub,
    );

    const domain = userDomains.find((d) => d.domain.name === name);

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    const liveVisitors = await this.eventsService.getLiveVisitors(
      domain.domain.id,
    );

    return {
      liveVisitors,
    };
  }

  @UseGuards(AuthGuard)
  @Get('/domains/:name/timeseries')
  async getTimeseries(
    @Req() req: Request,
    @Param('name') name: string,
    @Query() query: FilterEventsDto,
  ) {
    query.period ||= 'week';
    query.interval ||= 'day';
    query.date ||= dayjs().toISOString();

    const domain = await this.domainsService.findUnique({
      where: {
        name,
        users: {
          some: {
            userId: req['user'].sub,
          },
        },
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return this.eventsService.getAllEventsInPeriod(domain.id, query);
  }

  @UseGuards(AuthGuard)
  @Get('/domains/:name/:type')
  async getDomainInfo(
    @Req() req: Request,
    @Param('name') name: string,
    @Param('type') type: string,
    @Query() query: FilterEventsDto,
  ) {
    query.period ||= 'week';
    query.interval ||= 'day';
    query.date ||= dayjs().toISOString();

    const domain = await this.domainsService.findUnique({
      where: {
        name,
        users: {
          some: {
            userId: req['user'].sub,
          },
        },
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    switch (type) {
      case 'referrers':
        return this.eventsService.getAllReferrersInPeriod(domain.id, query);
      case 'pages':
        return this.eventsService.getAllPagesInPeriod(domain.id, query);
      case 'countries':
        return this.eventsService.getAllCountriesInPeriod(domain.id, query);
      case 'os':
        return this.eventsService.getAllOsInPeriod(domain.id, query);
      case 'browsers':
        return this.eventsService.getAllBrowsersInPeriod(domain.id, query);
      default:
        throw new BadRequestException('Invalid type');
    }
  }

  @UseGuards(AuthGuard)
  @Get('/domains/:name/members')
  async getDomainMembers(@Req() req: Request, @Param('name') name: string) {
    const domain = await this.domainsService.findUnique({
      where: {
        name,
        users: {
          some: {
            userId: req['user'].sub,
          },
        },
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return this.domainsService.getMembersByDomainId(domain.id);
  }

  @UseGuards(AuthGuard)
  @Delete('/domains/:name')
  async removeDomain(@Req() req: Request, @Param('name') name: string) {
    console.log('DELETE /domains/:name', { name });

    const domain = await this.domainsService.findUnique({
      where: {
        name,
        users: {
          some: {
            userId: req['user'].sub,
          },
        },
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    try {
      await this.domainsService.deleteOneById(domain.id);

      return {
        status: 'ok',
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Post('/events')
  async create(
    @Req() request: Request,
    @Body() createEventDto: CreateEventDto,
  ) {
    const user = await this.usersService.findMany({
      where: {
        domains: {
          some: {
            domain: {
              name: createEventDto.d,
            },
          },
        },
      },
    });

    if (!user || user.length === 0) {
      throw new NotFoundException('User not found');
    }

    const eventCount = await this.eventsService.count({
      where: {
        domain: {
          users: {
            some: {
              userId: user[0].id,
            },
          },
        },
        createdAt: {
          gte: dayjs().startOf('month').toDate(),
          lte: dayjs().endOf('month').toDate(),
        },
      },
    });

    const subscription =
      await this.subscriptionsService.findSubscriptionByDomain(
        createEventDto.d,
      );

    let maxViews = FREE_PLAN_VIEW_LIMIT;

    if (subscription) {
      maxViews = plans[subscription.subscriptionPlan].maxViews;
    } else if (createEventDto.d.includes('ccelerli')) {
      maxViews = 50_000;
    }

    if (eventCount >= maxViews) {
      console.log('Monthly limit exceeded', {
        domain: createEventDto.d,
        eventCount,
        maxViews,
      });

      throw new BadRequestException('Monthly limit exceeded');
    }

    const ua = request.headers['user-agent'];

    if (isbot(ua)) {
      throw new BadRequestException('Bot detected');
    }

    const host = new URL(createEventDto.h).host;

    if (host !== createEventDto.d.toLowerCase()) {
      throw new BadRequestException('Host and domain do not match');
    }

    const ip = requestIp.getClientIp(request);

    console.log('POST /events', {
      createEventDto,
    });

    try {
      const event = await this.eventsService.create(createEventDto, {
        ip,
        ua,
      });

      await this.sessionsService.handleSession(event);
    } catch (error) {
      console.error('Error creating event', error);
    }

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

  @Get('/subscriptions/plans')
  async getSubscriptions() {
    try {
      return this.subscriptionsService.getSubscriptions({
        includeFree: true,
      });
    } catch (error) {
      console.error('Error getting subscriptions', error);

      return [];
    }
  }

  @UseGuards(AuthGuard)
  @Post('/subscriptions/checkout-session')
  async createCheckoutSession(
    @Req() req: Request,
    @Body() createCheckoutSession: CreateCheckoutSessionDto,
  ) {
    console.log('POST /subscriptions/checkout-session', {
      createCheckoutSession,
    });

    return this.subscriptionsService.createCheckoutSession(
      req['user'].sub,
      createCheckoutSession,
    );
  }

  @UseGuards(AuthGuard)
  @Post('/subscriptions/billing-portal-session')
  async createBillingPortalSession(
    @Req() req: Request,
    @Body() createBillingPortalSessionDto: CreateBillingPortalSessionDto,
  ) {
    console.log('POST /subscriptions/billing-portal-session');

    return this.subscriptionsService.createBillingPortalSession(
      req['user'].sub,
      createBillingPortalSessionDto,
    );
  }

  @UseGuards(AuthGuard)
  @Get('/subscription')
  async getSubscription(@Req() req: Request) {
    const subscription =
      await this.subscriptionsService.findSubscriptionByUserId(req['user'].sub);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  @UseGuards(AuthGuard)
  @Post('/subscriptions/change-plan')
  async changeSubscriptionPlan(
    @Req() req: Request,
    @Body() changeSubscriptionPlanDto: ChangeSubscriptionPlanDto,
  ) {
    console.log('POST /subscriptions/change-plan', {
      changeSubscriptionPlanDto,
    });

    return this.subscriptionsService.changeSubscriptionPlan(
      req['user'].sub,
      changeSubscriptionPlanDto,
    );
  }

  @UseGuards(AuthGuard)
  @Post('/subscriptions/unsubscribe')
  async unsubscribe(@Req() req: Request) {
    console.log('POST /subscriptions/unsubscribe');

    return this.subscriptionsService.unsubscribe(req['user'].sub);
  }

  @UseGuards(AuthGuard)
  @Post('/subscriptions/resubscribe')
  async resubscribe(@Req() req: Request) {
    console.log('POST /subscriptions/resubscribe');

    return this.subscriptionsService.resubscribe(req['user'].sub);
  }
}
