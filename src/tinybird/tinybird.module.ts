import { Module } from '@nestjs/common';
import { TinybirdService } from './tinybird.service';

@Module({
  providers: [TinybirdService],
  exports: [TinybirdService],
})
export class TinybirdModule {}
