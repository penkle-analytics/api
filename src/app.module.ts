import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GatewayModule } from './gateway/gateway.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DbModule } from './db/db.module';

@Module({
  imports: [GatewayModule, EventsModule, AuthModule, UsersModule, DbModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
