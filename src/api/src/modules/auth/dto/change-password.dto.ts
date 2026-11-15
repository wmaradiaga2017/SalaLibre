import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/** RN-18: la nueva contraseña tiene al menos 8 caracteres; cambiarla exige la actual. */
export class ChangePasswordDto {
  @ApiProperty({ example: 'Empleado12345' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: 'Nueva12345', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
