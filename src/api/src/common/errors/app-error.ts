import { ERROR_STATUS, type ErrorCode } from './error-codes';

/**
 * Error de la aplicación con un código de spec §8. El estado HTTP se deriva del código.
 * Los errores de negocio de los módulos se lanzan siempre como `AppError`.
 * No depende de `@nestjs/*`, así que el dominio puede usarlo.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = ERROR_STATUS[code];
  }
}
