import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { DbModule } from 'src/db/db.module';
import { UsersModule } from 'src/users/users.module';
import { DomainsModule } from 'src/domains/domains.module';

@Module({
  imports: [DbModule, UsersModule, DomainsModule],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
