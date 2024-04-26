import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from './config/config';
import * as cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { SentryFilter } from './sentry.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const { httpAdapter } = app.get(HttpAdapterHost);

  const port = configService.get<Config['port']>('port');
  const sentryDsn = configService.get<Config['sentryDsn']>('sentryDsn');
  const env = configService.get<Config['env']>('env');

  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  if (env === 'production') {
    app.useGlobalFilters(new SentryFilter(httpAdapter));
  }
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.listen(port);
}

bootstrap();
