import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { DomainsModule } from 'src/domains/domains.module';
import { EventsModule } from 'src/events/events.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { SessionsModule } from 'src/sessions/sessions.module';
import { TinybirdModule } from 'src/tinybird/tinybird.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    DomainsModule,
    SessionsModule,
    EventsModule,
    SubscriptionsModule,
    TinybirdModule,
  ],
  controllers: [GatewayController],
})
export class GatewayModule {}
