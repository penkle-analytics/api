import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { DbModule } from 'src/db/db.module';
import { SessionsModule } from 'src/sessions/sessions.module';
import { GeoModule } from 'src/geo/geo.module';

@Module({
  imports: [DbModule, SessionsModule, GeoModule],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
