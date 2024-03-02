import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [DbModule],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
