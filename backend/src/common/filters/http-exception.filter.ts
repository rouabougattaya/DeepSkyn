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
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (isHttpException) {
      ({ message, error, code, details } = this.parseHttpExceptionBody(exception));
    } else {
      ({ message, error } = this.handleNonHttpException(exception));
    }

    const body = {
      statusCode: status,
      error,
      message,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private parseHttpExceptionBody(exception: HttpException): {
    message: string;
    error: string;
    code?: string;
    details?: Record<string, unknown>;
  } {
    const res = exception.getResponse();
    const msg = typeof res === 'string' ? res : (res as { message?: string | string[] }).message;
    const message = Array.isArray(msg) ? msg.join(', ') : (msg ?? exception.message);
    const error = exception.name;
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (typeof res !== 'string') {
      const responseObject = res as Record<string, unknown>;
      if (typeof responseObject.code === 'string') {
        code = responseObject.code;
      }
      const { statusCode: _s, message: _m, error: _e, code: _c, ...rest } = responseObject;
      if (Object.keys(rest).length > 0) {
        details = rest;
      }
    }

    return { message, error, code, details };
  }

  private handleNonHttpException(exception: unknown): { message: string; error: string } {
    this.logger.error(exception);
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Une erreur interne est survenue.'
        : (exception as Error).message ?? 'Internal server error';
    return { message, error: 'Internal Server Error' };
  }
}
