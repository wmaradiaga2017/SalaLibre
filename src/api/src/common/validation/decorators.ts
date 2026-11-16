import { applyDecorators } from '@nestjs/common';
import { Matches, ValidateBy, ValidateIf } from 'class-validator';

/** Nombre de la restricción que el `ValidationPipe` global reconoce para decir que un campo no puede ser `null`. */
export const NOT_NULL = 'notNull';

/**
 * Campo opcional de un `PATCH`: si no viene, no se valida ni se toca; si viene en `null`, se rechaza con 400 y el
 * mensaje lo dice ("name (no puede ser null)"). Reemplaza a `@IsOptional`, que deja pasar `null` hasta la base.
 */
export function OptionalNotNull(): PropertyDecorator {
  return applyDecorators(
    ValidateIf((_object: object, value: unknown) => value !== undefined),
    ValidateBy({ name: NOT_NULL, validator: { validate: (value: unknown) => value !== null } }),
  );
}

/** Texto obligatorio con al menos un carácter que no sea espacio (revisión de T04). */
export function NotBlank(): PropertyDecorator {
  return Matches(/\S/);
}
