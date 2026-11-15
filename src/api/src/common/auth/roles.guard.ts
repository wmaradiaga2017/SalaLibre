import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '../errors/app-error';
import { ROLES_KEY } from './decorators';
import type { SessionRole, SessionUser } from './session';

/** Aplica `@Roles(...)` con el rol releído de la base (RN-21). Corre después de `JwtAuthGuard`. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<SessionRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }
    const user = context.switchToHttp().getRequest<Request>().user as SessionUser | undefined;
    if (!user || !roles.includes(user.role)) {
      throw new AppError('FORBIDDEN', 'No tienes permiso para realizar esta acción.');
    }
    return true;
  }
}
