import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const req = ctx.getRequest();

      const payload = {
        URL: req.url,
        Method: req.method,
        Body: req.body,
        Query: req.query,
        Params: req.params,
        Headers: req.headers,
        IP: req.ip,
        User: req.user,
      };

      Sentry.getCurrentScope().clear();
      Sentry.captureException(exception, (scope) => {
        Sentry.setContext('Context', payload);

        return scope;
      });
    }

    super.catch(exception, host);
  }
}
