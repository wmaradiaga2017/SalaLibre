import { Controller, Get } from '@nestjs/common';
import { CurrentUser, Roles } from '../../src/common/auth/decorators';
import type { SessionUser } from '../../src/common/auth/session';

/** Controlador solo para pruebas del guard global y de roles (CA7). No forma parte de la API de producción. */
@Controller('test-auth')
export class AuthTestController {
  /** Ruta "nueva" sin `@Public()`: debe exigir sesión. */
  @Get('private')
  privateRoute(@CurrentUser() user: SessionUser): { userId: string } {
    return { userId: user.id };
  }

  @Roles('ADMIN')
  @Get('admin')
  adminRoute(): { ok: true } {
    return { ok: true };
  }
}
