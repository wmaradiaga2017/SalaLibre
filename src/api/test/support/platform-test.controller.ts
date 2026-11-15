import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsInt, IsString, Length, Min } from 'class-validator';
import { AppError } from '../../src/common/errors/app-error';

/** DTO de prueba para el ValidationPipe. */
export class EchoDto {
  @IsString()
  @Length(1, 10)
  name!: string;

  @IsInt()
  @Min(1)
  attendees!: number;
}

/** Controlador solo para pruebas de la plataforma transversal. No forma parte de la API de producción. */
@Controller('test')
export class PlatformTestController {
  @Get('ok')
  ok(): { ok: true } {
    return { ok: true };
  }

  @Post('echo')
  echo(@Body() body: EchoDto): EchoDto {
    return body;
  }

  @Get('boom')
  boom(): never {
    throw new Error('detalle interno: conexión a db:5432 con usuario salalibre');
  }

  @Get('business')
  business(): never {
    throw new AppError('ROOM_INACTIVE', 'La sala está inactiva.');
  }
}
