import { isUtf8 } from 'node:buffer';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

/**
 * Revisión de T04: un cuerpo que no es UTF-8 válido se rechaza con 400 `VALIDATION_ERROR`, en lugar de decodificarlo
 * con caracteres de reemplazo (`�`) y guardarlo así. Usa `req.rawBody`, que Nest llena con la opción `rawBody: true`
 * (`main.ts` y las pruebas). Va después de los parsers (`configureApp`).
 */
export function rejectNonUtf8Body(req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction): void {
  if (req.rawBody && !isUtf8(req.rawBody)) {
    next(new AppError('VALIDATION_ERROR', 'El cuerpo de la petición no es texto UTF-8 válido.'));
    return;
  }
  next();
}
