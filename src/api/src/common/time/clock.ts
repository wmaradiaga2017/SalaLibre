/** Fuente del instante actual. Se inyecta por token para fijar "ahora" en las pruebas (RN-05, RN-06, RN-12). */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
