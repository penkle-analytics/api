import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from './config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<Config['port']>('port');

  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: '*',
  });

  await app.listen(port);
}

bootstrap();
