/** Acciones auditadas (spec §7, enum `AuditAction`). El login no se audita (S-02). */
export const AUDIT_ACTIONS = [
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'ROOM_CREATED',
  'ROOM_UPDATED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_PASSWORD_RESET',
  'USER_PASSWORD_CHANGED',
  'CLOSURE_CREATED',
  'CLOSURE_DELETED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Entidades de `audit_logs.entity` (spec §7). */
export type AuditEntity = 'booking' | 'room' | 'user' | 'closure';

/** Valores JSON que admite `audit_logs.data`. */
export type AuditValue = string | number | boolean | null | AuditValue[] | { [key: string]: AuditValue };
export type AuditData = Record<string, AuditValue>;

/**
 * Datos que reciben `record` y `recordMany`. Admite campos `undefined` (un `PATCH` parcial los trae así, B-80): se
 * quitan antes de guardar con `compactData`, así solo queda lo que cambió.
 */
export type AuditDataInput = { [key: string]: AuditValue | AuditDataInput | undefined };

/** Lo que cada operación de negocio registra. El actor y el request ID los agrega `AuditService`. */
export interface AuditEntry {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  data?: AuditDataInput;
}

/** Fila completa que se inserta en `audit_logs`. */
export interface AuditRecord {
  actorId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  data: AuditData;
  requestId: string;
}

/**
 * RN-25 y D-24: `pageSize` 20 por defecto y 100 como máximo; `page` empieza en 1. `pageMax` mantiene el `OFFSET`
 * dentro de un entero de 32 bits ((pageMax − 1) × 100 < 2³¹), para que una página absurda dé 400 y no 500.
 */
export const AUDIT_PAGE = { defaultPage: 1, defaultPageSize: 20, pageSizeMax: 100, pageMax: 21_474_836 } as const;

/** Criterios ya resueltos de `POST /audit-logs/search`: `from` incluido y `to` excluido, como instantes UTC. */
export interface AuditQuery {
  page: number;
  pageSize: number;
  from?: Date;
  to?: Date;
  action?: AuditAction;
}

/** Elemento de `AuditPage` (spec §8). `actor` es `null` solo en filas del seed (spec §7). */
export interface AuditItem {
  id: string;
  createdAt: Date;
  actor: { id: string; name: string } | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  requestId: string;
}

export interface AuditPage {
  items: AuditItem[];
  page: number;
  pageSize: number;
  total: number;
}

/** Claves que nunca pueden aparecer en `data` (spec §7, CLAUDE.md: sin contraseñas, hashes, cookies ni tokens). */
const SECRET_KEY = /password|hash|token|cookie|secret/i;

/** Devuelve las rutas de las claves de `data` que parecen secretos (vacío si no hay ninguna). */
export function secretKeys(data: AuditValue, path = ''): string[] {
  if (Array.isArray(data)) {
    return data.flatMap((v, i) => secretKeys(v, `${path}[${i}]`));
  }
  if (data === null || typeof data !== 'object') {
    return [];
  }
  return Object.entries(data).flatMap(([key, value]) => {
    const here = path ? `${path}.${key}` : key;
    return [...(SECRET_KEY.test(key) ? [here] : []), ...secretKeys(value, here)];
  });
}

/** Quita los campos `undefined`, también en objetos anidados (B-80). */
export function compactData(data: AuditDataInput): AuditData {
  const result: AuditData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    result[key] = isObject ? compactData(value as AuditDataInput) : (value as AuditValue);
  }
  return result;
}
