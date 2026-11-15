import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'empleado1@salalibre.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Empleado12345' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
