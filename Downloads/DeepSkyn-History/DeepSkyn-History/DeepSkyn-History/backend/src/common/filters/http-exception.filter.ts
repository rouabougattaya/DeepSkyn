import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtre d'exception global : réponse JSON homogène, pas de fuite d'info en production.
 * Toutes les exceptions passent par ici.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;
    let error: string;

    if (isHttpException) {
      const res = exception.getResponse();
      const msg = typeof res === 'string' ? res : (res as { message?: string | string[] }).message;
      message = Array.isArray(msg) ? msg.join(', ') : (msg ?? exception.message);
      error = exception.name;
    } else {
      this.logger.error(exception);
      message =
        process.env.NODE_ENV === 'production'
          ? 'Une erreur interne est survenue.'
          : (exception as Error).message ?? 'Internal server error';
      error = 'Internal Server Error';
    }

    const body = {
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }
}
