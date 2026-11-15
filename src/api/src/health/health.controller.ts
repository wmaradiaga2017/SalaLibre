import { Controller, Get } from '@nestjs/common';

// T01: health mínimo, no consulta la base. `@Public()` se agrega en T03 junto con el guard global.
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
