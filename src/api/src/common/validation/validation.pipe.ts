import { ValidationError, ValidationPipe } from '@nestjs/common';
import { AppError } from '../errors/app-error';

function collectFields(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const own = error.constraints ? [path] : [];
    return [...own, ...collectFields(error.children ?? [], path)];
  });
}

/** `ValidationPipe` global: `whitelist`, `forbidNonWhitelisted` y `transform`; responde 400 `VALIDATION_ERROR`. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppError('VALIDATION_ERROR', `Datos inválidos o no permitidos: ${collectFields(errors).join(', ')}.`),
  });
}
