import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import type { AuditItem, AuditQuery, AuditRecord } from './audit';

/**
 * Repositorio de auditoría (interfaz). La implementación Prisma vive en `infrastructure/`. Solo inserta y consulta:
 * `audit_logs` es inmutable (D-05) y el trigger de la base rechaza cualquier `UPDATE` o `DELETE`.
 */
export interface AuditRepository {
  /** Inserta las filas dentro de la transacción de la escritura de negocio (D-05). */
  insertMany(ctx: TransactionContext, records: AuditRecord[]): Promise<void>;
  /** `COUNT` + `LIMIT/OFFSET` con los mismos filtros, ordenado por `createdAt` desc (RN-25, D-24). */
  search(query: AuditQuery): Promise<{ items: AuditItem[]; total: number }>;
}

export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');
