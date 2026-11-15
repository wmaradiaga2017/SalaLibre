import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionRole, SessionUser } from './session';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Ruta sin sesión. Solo `POST /auth/login` y `GET /health` (CLAUDE.md, D-03). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Roles que pueden llamar a la ruta (RN-21). */
export const Roles = (...roles: SessionRole[]) => SetMetadata(ROLES_KEY, roles);

/** Usuario de la sesión, puesto por `JwtAuthGuard`. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionUser => {
  return ctx.switchToHttp().getRequest<Request>().user as SessionUser;
});
