/**
 * Contrato de transacciones que usan los services (CLAUDE.md: los services dependen de interfaces por token).
 * Toda escritura corre dentro de `run(ctx => …)`; desde T06a, la auditoría va en la misma transacción.
 */
export interface TransactionContext {
  /** Toma `pg_advisory_xact_lock` sobre la clave; se libera al terminar la transacción (spec §11). */
  advisoryLock(key: string): Promise<void>;
}

export interface TransactionRunner {
  /** Confirma si `work` termina bien; revierte si lanza. */
  run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}

export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');
