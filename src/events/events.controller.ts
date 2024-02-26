import { Body, Controller, Post } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('/')
  create(@Body() createEventDto: CreateEventDto) {
    try {
      return this.eventsService.create(createEventDto);
    } catch (e) {
      // TODO: Add winston logger
      console.error(e);
    }
  }
}
