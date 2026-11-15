import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

// `@Public()` se agrega en T03 junto con el guard global.
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  check(): Promise<{ status: 'ok' }> {
    return this.health.check();
  }
}
