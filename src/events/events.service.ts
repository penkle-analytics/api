import { Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  create(createEventDto: CreateEventDto) {
    console.log(createEventDto);
  }
}
