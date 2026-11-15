import 'express';
import type { SessionUser } from '../auth/session';

declare module 'express-serve-static-core' {
  interface Request {
    /** Request ID asignado por `requestIdMiddleware`. */
    id: string;
    /** Usuario de la sesión, asignado por `JwtAuthGuard`. */
    user?: SessionUser;
  }
}
