import { BadRequestException, Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreateEventDto } from 'src/events/dto/create-event.dto';
import { EventsService } from 'src/events/events.service';
import * as requestIp from 'request-ip';
import { SessionsService } from 'src/sessions/sessions.service';

@Controller('/')
export class GatewayEventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Post('/events')
  async create(@Req() request: Request, @Body() createEventDto: CreateEventDto) {
    console.log('POST /events', {
      createEventDto,
    });

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
