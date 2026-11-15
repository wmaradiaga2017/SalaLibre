import type { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionContext, PrismaTransactionRunner, prismaTx } from './prisma-transaction-runner';

/**
 * Simula `prisma.$transaction(fn)`: confirma si fn termina bien y revierte si lanza.
 * La prueba contra PostgreSQL real está en docs/tareas/T02a.md (pg_locks dentro de la transacción).
 */
function fakePrisma() {
  const log: string[] = [];
  const tx = {
    $executeRaw: jest.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      log.push(`${strings.join('?')} [${values.join(',')}]`);
      return 1;
    }),
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => {
      log.push('BEGIN');
      try {
        const result = await fn(tx);
        log.push('COMMIT');
        return result;
      } catch (error) {
        log.push('ROLLBACK');
        throw error;
      }
    }),
  };
  return { prisma: prisma as unknown as PrismaService, log };
}

describe('PrismaTransactionRunner', () => {
  it('D-05 · run confirma cuando el callback termina bien', async () => {
    const { prisma, log } = fakePrisma();
    const result = await new PrismaTransactionRunner(prisma).run(async () => 'listo');

    expect(result).toBe('listo');
    expect(log).toEqual(['BEGIN', 'COMMIT']);
  });

  it('D-05 · run revierte cuando el callback lanza', async () => {
    const { prisma, log } = fakePrisma();
    const runner = new PrismaTransactionRunner(prisma);

    await expect(
      runner.run(async () => {
        throw new Error('falla');
      }),
    ).rejects.toThrow('falla');
    expect(log).toEqual(['BEGIN', 'ROLLBACK']);
  });

  it('spec §11 · advisoryLock ejecuta pg_advisory_xact_lock dentro de la transacción', async () => {
    const { prisma, log } = fakePrisma();
    await new PrismaTransactionRunner(prisma).run((ctx) => ctx.advisoryLock('closure-date:2030-01-07'));

    expect(log[0]).toBe('BEGIN');
    expect(log[1]).toContain('pg_advisory_xact_lock(hashtextextended(');
    expect(log[1]).toContain('[closure-date:2030-01-07]');
    expect(log[2]).toBe('COMMIT');
  });

  it('prismaTx devuelve el cliente transaccional y rechaza otros contextos', () => {
    const tx = {} as never;
    expect(prismaTx(new PrismaTransactionContext(tx))).toBe(tx);
    expect(() => prismaTx({ advisoryLock: async () => undefined })).toThrow();
  });
});
