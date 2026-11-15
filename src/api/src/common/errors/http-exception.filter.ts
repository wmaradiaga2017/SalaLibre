import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { AppError } from './app-error';
import { DEFAULT_MESSAGES, type ErrorCode } from './error-codes';

interface ErrorBody {
  error: { code: ErrorCode; message: string; requestId: string };
}

/**
 * Filtro global: toda respuesta de error usa `{ error: { code, message, requestId } }` (D-06)
 * y nunca incluye stack traces ni detalles internos.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const requestId = String(req.id ?? '');

    const { status, code, message } = this.toError(exception);

    if (status >= 500) {
      // El detalle solo va al log, nunca a la respuesta.
      this.logger.error({ requestId, err: exception }, 'error no controlado');
    }

    if (res.headersSent) {
      return;
    }
    const body: ErrorBody = { error: { code, message, requestId } };
    res.status(status).json(body);
  }

  private toError(exception: unknown): { status: number; code: ErrorCode; message: string } {
    if (exception instanceof AppError) {
      return { status: exception.status, code: exception.code, message: exception.message };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = this.codeForStatus(status);
      return { status: code === 'INTERNAL_ERROR' ? 500 : status, code, message: DEFAULT_MESSAGES[code] ?? '' };
    }
    return { status: 500, code: 'INTERNAL_ERROR', message: DEFAULT_MESSAGES.INTERNAL_ERROR ?? '' };
  }

  private codeForStatus(status: number): ErrorCode {
    switch (status) {
      case 401:
        return 'UNAUTHENTICATED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      default:
        // Cualquier otro 4xx de Nest o Express (JSON mal formado, cuerpo muy grande…) es un problema de formato.
        return status >= 400 && status < 500 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
    }
  }
}
