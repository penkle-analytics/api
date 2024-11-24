import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { DomainsModule } from 'src/domains/domains.module';
import { EventsModule } from 'src/events/events.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { SessionsModule } from 'src/sessions/sessions.module';
import { GatewayDomainsController } from './domains.controller';
import { GatewaySubscriptionsController } from './subscriptions.controller';
import { GatewayEventsController } from './events.controller';
import { GatewayAuthController } from './auth.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [
    DbModule,
    UsersModule,
    AuthModule,
    DomainsModule,
    SessionsModule,
    EventsModule,
    SubscriptionsModule,
  ],
  controllers: [
    GatewayAuthController,
    GatewayDomainsController,
    GatewayEventsController,
    GatewaySubscriptionsController,
  ],
})
export class GatewayModule {}
