import { Module } from '@nestjs/common';
import { DomainsService } from './domains.service';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [DbModule],
  providers: [DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}
