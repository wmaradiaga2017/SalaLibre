import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    /** Request ID asignado por `requestIdMiddleware`. */
    id: string;
  }
}
