import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [DbModule],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
