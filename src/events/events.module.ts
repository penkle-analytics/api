import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { DbModule } from 'src/db/db.module';
import { SessionsModule } from 'src/sessions/sessions.module';

@Module({
  imports: [DbModule, SessionsModule],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
