import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [GatewayController],
})
export class GatewayModule {}
