import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GatewayModule } from './gateway/gateway.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [GatewayModule, EventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
