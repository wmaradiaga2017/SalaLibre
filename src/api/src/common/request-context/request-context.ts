import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Datos de la petición en curso que necesita la auditoría (T06a, D-05): el request ID y el usuario de la sesión.
 * Los fija `RequestContextInterceptor` (después de los guards) y los lee `AuditService`, así los services no tienen
 * que pasarlos a mano en cada escritura. No depende de Nest.
 */
export interface RequestContext {
  requestId: string;
  /** Usuario de la sesión; `null` solo en rutas públicas, que no escriben datos de negocio. */
  actorId: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Ejecuta `work` con `context` como contexto de la petición. */
export function runWithRequestContext<T>(context: RequestContext, work: () => T): T {
  return storage.run(context, work);
}

/** Contexto de la petición en curso, o `undefined` fuera de una petición HTTP. */
export function currentRequestContext(): RequestContext | undefined {
  return storage.getStore();
}
