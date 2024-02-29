import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { DomainsModule } from 'src/domains/domains.module';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [UsersModule, AuthModule, DomainsModule, EventsModule],
  controllers: [GatewayController],
})
export class GatewayModule {}
