import { Module } from '@nestjs/common';
import { DbService } from './db.service';
import { DbProvider } from './db.provider';

@Module({
  providers: [DbProvider, DbService],
  exports: [DbProvider, DbService],
})
export class DbModule {}
