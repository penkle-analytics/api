import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { DbModule } from 'src/db/db.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [DbModule],
  providers: [WebhooksService],
  exports: [WebhooksService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
