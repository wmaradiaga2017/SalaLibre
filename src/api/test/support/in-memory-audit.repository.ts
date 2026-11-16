import { randomUUID } from 'node:crypto';
import type { TransactionContext } from '../../src/common/transaction/transaction-runner';
import type { AuditItem, AuditQuery, AuditRecord } from '../../src/modules/audit/domain/audit';
import type { AuditRepository } from '../../src/modules/audit/domain/audit.repository';

export interface StoredAuditRow extends AuditRecord {
  id: string;
  createdAt: Date;
}

/**
 * `AuditRepository` sin base para las pruebas HTTP. Guarda las filas en orden y responde la búsqueda como la base
 * (`createdAt` desc y luego id desc). No emula el rollback: eso lo prueba la suite de integración (CA2).
 */
export class InMemoryAuditRepository implements AuditRepository {
  readonly rows: StoredAuditRow[] = [];
  /** Nombres de actor para `search` (en la base sale del JOIN con `users`). */
  readonly names = new Map<string, string>();
  private seq = 0;

  async insertMany(_ctx: TransactionContext, records: AuditRecord[]): Promise<void> {
    for (const r of records) {
      // Un milisegundo por fila para que el orden sea determinista en las pruebas.
      this.rows.push({ ...r, id: randomUUID(), createdAt: new Date(Date.UTC(2026, 0, 1) + this.seq++) });
    }
  }

  async search(query: AuditQuery): Promise<{ items: AuditItem[]; total: number }> {
    const matching = this.rows
      .filter((r) => !query.action || r.action === query.action)
      .filter((r) => !query.from || r.createdAt >= query.from)
      .filter((r) => !query.to || r.createdAt < query.to)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
    const start = (query.page - 1) * query.pageSize;
    const items = matching.slice(start, start + query.pageSize).map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      actor: { id: r.actorId, name: this.names.get(r.actorId) ?? r.actorId },
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      requestId: r.requestId,
    }));
    return { items, total: matching.length };
  }
}
