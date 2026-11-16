import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsString, Length, MinLength } from 'class-validator';
import { NotBlank, OptionalNotNull } from '../../../common/validation/decorators';
import { ROLES, USER_LIMITS, type Role } from '../domain/user';

// spec §7 (`users`) y §8: nombre 1–100 caracteres (no solo espacios), correo válido, contraseña ≥ 8 (RN-18) y rol de
// la lista. El correo se normaliza a minúsculas en el service (RN-23).

export class CreateUserDto {
  @ApiProperty({ example: 'Empleado Nuevo', minLength: 1, maxLength: USER_LIMITS.nameMax })
  @IsString()
  @Length(1, USER_LIMITS.nameMax)
  @NotBlank()
  name!: string;

  @ApiProperty({ example: 'empleado.nuevo@salalibre.local' })
  @IsString()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Inicial12345', minLength: USER_LIMITS.passwordMin })
  @IsString()
  @MinLength(USER_LIMITS.passwordMin)
  password!: string;

  @ApiProperty({ enum: ROLES, example: 'EMPLOYEE' })
  @IsIn(ROLES)
  role!: Role;
}

/**
 * Body parcial de `PATCH /users/:id`. Un campo ausente no se toca; `null` → 400 "no puede ser null".
 * `email` y `password` no se aceptan (`forbidNonWhitelisted` → 400): el correo no se edita y la contraseña se
 * restablece con `POST /users/:id/reset-password`.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Empleado Uno', minLength: 1, maxLength: USER_LIMITS.nameMax })
  @OptionalNotNull()
  @IsString()
  @Length(1, USER_LIMITS.nameMax)
  @NotBlank()
  name?: string;

  @ApiPropertyOptional({ enum: ROLES, example: 'ADMIN' })
  @OptionalNotNull()
  @IsIn(ROLES)
  role?: Role;

  @ApiPropertyOptional({ example: false })
  @OptionalNotNull()
  @IsBoolean()
  isActive?: boolean;
}

/** RN-18: la nueva contraseña tiene al menos 8 caracteres. */
export class ResetPasswordDto {
  @ApiProperty({ example: 'Nueva12345', minLength: USER_LIMITS.passwordMin })
  @IsString()
  @MinLength(USER_LIMITS.passwordMin)
  newPassword!: string;
}
