import { randomUUID } from 'node:crypto';
import { AppError } from '../../src/common/errors/app-error';
import type { TransactionContext } from '../../src/common/transaction/transaction-runner';
import type { Closure, NewClosure } from '../../src/modules/closures/domain/closure';
import type { ClosuresRepository } from '../../src/modules/closures/domain/closures.repository';

/**
 * Cierres en memoria. Emula el índice único `closures_date_key` (409 `CLOSURE_EXISTS`) y exige contexto en las
 * escrituras. `closedDates` puede ser el mismo `Set` que lee `InMemoryBookingsRepository.isDateClosed`, como en la base
 * comparten la tabla `closures` (RN-10).
 */
export class InMemoryClosuresRepository implements ClosuresRepository {
  readonly closures: (Closure & { createdById: string })[] = [];

  constructor(private readonly closedDates: Set<string> = new Set()) {}

  async listFrom(from: string): Promise<Closure[]> {
    return this.closures
      .filter((c) => c.date >= from)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(({ id, date, reason }) => ({ id, date, reason }));
  }

  async findById(id: string): Promise<Closure | null> {
    const c = this.closures.find((x) => x.id === id);
    return c ? { id: c.id, date: c.date, reason: c.reason } : null;
  }

  async create(ctx: TransactionContext, closure: NewClosure): Promise<Closure> {
    assertTx(ctx);
    if (this.closures.some((c) => c.date === closure.date)) {
      throw new AppError('CLOSURE_EXISTS', 'Esa fecha ya está registrada como día cerrado.');
    }
    const created = { id: randomUUID(), ...closure };
    this.closures.push(created);
    this.closedDates.add(closure.date);
    return { id: created.id, date: created.date, reason: created.reason };
  }

  async delete(ctx: TransactionContext, id: string): Promise<boolean> {
    assertTx(ctx);
    const index = this.closures.findIndex((c) => c.id === id);
    if (index < 0) {
      return false;
    }
    const [removed] = this.closures.splice(index, 1);
    this.closedDates.delete(removed.date);
    return true;
  }
}

function assertTx(ctx: TransactionContext | undefined): void {
  if (!ctx) {
    throw new Error('Operación de cierres fuera de una transacción');
  }
}
