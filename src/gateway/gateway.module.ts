import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [GatewayController],
})
export class GatewayModule {}
