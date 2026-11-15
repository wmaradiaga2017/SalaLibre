import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '../errors/app-error';
import { IS_PUBLIC_KEY } from './decorators';
import { SESSION_COOKIE, SESSION_RESOLVER, type SessionResolver } from './session';

/**
 * Guard global (denegación por defecto): toda ruta exige sesión salvo las marcadas con `@Public()`.
 * Sin cookie, token inválido o vencido, o usuario inactivo → 401 `UNAUTHENTICATED`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SESSION_RESOLVER) private readonly sessions: SessionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const user = typeof token === 'string' && token ? await this.sessions.resolve(token) : null;
    if (!user) {
      throw new AppError('UNAUTHENTICATED', 'Necesitas iniciar sesión.');
    }
    req.user = user;
    return true;
  }
}
