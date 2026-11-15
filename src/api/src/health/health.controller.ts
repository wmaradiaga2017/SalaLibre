import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/auth/decorators';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Ruta pública (CLAUDE.md): la usan los healthchecks de Docker. */
  @Public()
  @Get()
  check(): Promise<{ status: 'ok' }> {
    return this.health.check();
  }
}
