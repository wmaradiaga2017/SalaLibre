import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { runWithRequestContext } from './request-context';

/**
 * Fija el contexto de la petición (request ID y usuario de la sesión) para el handler y todo lo que este llame.
 * Es un interceptor y no un middleware porque corre después de los guards (ya existe `req.user`) y del body parser
 * (un middleware previo pierde el contexto en los callbacks del stream del cuerpo). El handler se suscribe dentro de
 * `runWithRequestContext`, así el contexto llega hasta la transacción.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<Request>();
    const store = { requestId: req.id, actorId: req.user?.id ?? null };
    return new Observable((subscriber) =>
      runWithRequestContext(store, () => next.handle().subscribe(subscriber)),
    );
  }
}
