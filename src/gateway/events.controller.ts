import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  Req,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import type { Request } from 'express';
import { CreateEventDto } from 'src/events/dto/create-event.dto';
import { EventsService } from 'src/events/events.service';
import * as requestIp from 'request-ip';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { FREE_PLAN_VIEW_LIMIT, plans } from 'src/config/stripe';
import { SessionsService } from 'src/sessions/sessions.service';

declare global {
  namespace Express {
    interface User {
      sub: string;
    }
  }
}

@Controller('/')
export class GatewayEventsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly sessionsService: SessionsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post('/events')
  async create(
    @Req() request: Request,
    @Body() createEventDto: CreateEventDto,
  ) {
    console.log('POST /events', {
      createEventDto,
    });

    const user = await this.usersService.findFirst({
      where: {
        domains: {
          some: {
            role: 'OWNER',
            domain: {
              name: createEventDto.d,
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const eventCount = await this.eventsService.getAllEventsForUser(user.id);

    const subscription =
      await this.subscriptionsService.findSubscriptionByDomain(
        createEventDto.d,
      );

    let maxViews = FREE_PLAN_VIEW_LIMIT;

    if (subscription) {
      maxViews = plans[subscription.plan].maxViews;
    }

    if (eventCount >= maxViews) {
      console.error('Monthly limit exceeded', {
        domain: createEventDto.d,
        eventCount,
        maxViews,
      });

      throw new BadRequestException('Monthly limit exceeded');
    }

    const ua = request.headers['user-agent'];
    const host = new URL(createEventDto.h).host;

    if (host !== createEventDto.d.toLowerCase()) {
      throw new BadRequestException('Host and domain do not match');
    }

    const ip = requestIp.getClientIp(request);

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
}
