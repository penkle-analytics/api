import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateDomainDto } from 'src/domains/dto/create-domain.dto';
import { DomainsService } from 'src/domains/domains.service';
import { EventsService } from 'src/events/events.service';
import * as dayjs from 'dayjs';
import { FilterEventsDto } from 'src/events/dto/filter-events.dto';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { FREE_PLAN_VIEW_LIMIT, plans } from 'src/config/stripe';

declare global {
  namespace Express {
    interface User {
      sub: string;
    }
  }
}

@Controller('/')
export class GatewayDomainsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly domainsService: DomainsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('/usage')
  async usage(@Req() req: Request) {
    const subscription =
      await this.subscriptionsService.findSubscriptionByUserId(req['user'].sub);

    const usage = await this.eventsService.getUsageForUser(req['user'].sub);

    return {
      limit: subscription
        ? plans[subscription.plan].maxViews
        : FREE_PLAN_VIEW_LIMIT,
      ...usage,
    };
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

    query.period ||= '7d';
    query.date ||= dayjs.utc().toISOString();

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

    const recentEvents = await this.eventsService.getRecentEventsByVisitor(
      domain.id,
    );

    return {
      count: recentEvents.length,
      visitors: recentEvents,
    };
  }

  @Get('/domains/penkle.com/timeseries')
  async getDemoTimeseries(@Query() query: FilterEventsDto) {
    const name = 'penkle.com';

    query.period ||= '7d';
    query.date ||= dayjs.utc().toISOString();

    const domain = await this.domainsService.findUnique({
      where: {
        name,
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return this.eventsService.timeseries(domain, query);
  }

  @Get('/domains/demo/:type')
  async getDemoDomainInfo(
    @Param('type') type: string,
    @Query() query: FilterEventsDto,
  ) {
    const name = 'penkle.com';

    query.period ||= '7d';
    query.date ||= dayjs.utc().toISOString();

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
        return this.eventsService.getAllReferrersInPeriod(domain, query);
      case 'pages':
        return this.eventsService.getAllPagesInPeriod(domain, query);
      case 'countries':
        return this.eventsService.getAllCountriesInPeriod(domain, query);
      case 'regions':
        return this.eventsService.getAllRegionsInPeriod(domain, query);
      case 'cities':
        return this.eventsService.getAllCitiesInPeriod(domain, query);
      case 'os':
        return this.eventsService.getAllOsInPeriod(domain, query);
      case 'browsers':
        return this.eventsService.getAllBrowsersInPeriod(domain, query);
      case 'devices':
        return this.eventsService.getAllDevicesInPeriod(domain, query);
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
    query.period ||= '7d';
    query.date ||= dayjs.utc().toISOString();

    const domain = await this.domainsService.findUnique({
      // TODO: Make sure this only returns the domain if it belongs to the user
      where: {
        name,
        users: { some: { userId: req['user'].sub } },
      },
    });

    // const eventsInMonth = await this.eventsService.count({
    //   where: {
    //     domain: {
    //       id: domain.id,
    //     },
    //     createdAt: {
    //       gte: dayjs().startOf('month').toDate(),
    //       lte: dayjs().endOf('month').toDate(),
    //     },
    //   },
    // });

    // const subscription =
    //   await this.subscriptionsService.findSubscriptionByDomain(domain.name);

    // let maxViews = FREE_PLAN_VIEW_LIMIT;

    // if (subscription) {
    //   maxViews = plans[subscription.plan].maxViews;
    // }

    return {
      ...domain,
      hasExceededLimit: false,
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

    const recentEvents = await this.eventsService.getRecentEventsByVisitor(
      domain.domain.id,
    );

    return {
      count: recentEvents.length,
      visitors: recentEvents,
    };
  }

  @UseGuards(AuthGuard)
  @Get('/domains/:name/timeseries')
  async getTimeseries(
    @Req() req: Request,
    @Param('name') name: string,
    @Query() filters: FilterEventsDto,
  ) {
    filters.period ||= '7d';
    filters.date ||= dayjs.utc().toISOString();

    const subscription = this.subscriptionsService.findSubscriptionByUserId(
      req['user'].sub,
    );

    if (filters.period === 'y' && !subscription) {
      throw new ForbiddenException(
        'Premium subscription required for yearly data',
      );
    }

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

    return this.eventsService.timeseries(domain, filters);
  }

  @UseGuards(AuthGuard)
  @Get('/domains/:name/:type')
  async getDomainInfo(
    @Req() req: Request,
    @Param('name') name: string,
    @Param('type') type: string,
    @Query() query: FilterEventsDto,
  ) {
    query.period ||= '7d';
    query.date ||= dayjs.utc().toISOString();

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
        return this.eventsService.getAllReferrersInPeriod(domain, query);
      case 'pages':
        return this.eventsService.getAllPagesInPeriod(domain, query);
      case 'countries':
        return this.eventsService.getAllCountriesInPeriod(domain, query);
      case 'regions':
        return this.eventsService.getAllRegionsInPeriod(domain, query);
      case 'cities':
        return this.eventsService.getAllCitiesInPeriod(domain, query);
      case 'os':
        return this.eventsService.getAllOsInPeriod(domain, query);
      case 'browsers':
        return this.eventsService.getAllBrowsersInPeriod(domain, query);
      case 'devices':
        return this.eventsService.getAllDevicesInPeriod(domain, query);
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
