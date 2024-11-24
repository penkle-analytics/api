import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { AuthGuard, PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<Config['jwtSecret']>('jwtSecret'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    PassportModule,
    UsersModule,
    ConfigModule,
    DbModule,
  ],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
