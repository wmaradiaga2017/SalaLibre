import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { TransactionContext, TransactionRunner } from './transaction-runner';

/** Contexto de transacción de Prisma. Solo los repositorios Prisma acceden a `tx` (con `prismaTx`). */
export class PrismaTransactionContext implements TransactionContext {
  constructor(readonly tx: Prisma.TransactionClient) {}

  async advisoryLock(key: string): Promise<void> {
    // hashtextextended convierte la clave de texto en el bigint que pide pg_advisory_xact_lock.
    await this.tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
}

/** Devuelve el cliente transaccional de Prisma a partir del contexto. Uso exclusivo de repositorios Prisma. */
export function prismaTx(ctx: TransactionContext): Prisma.TransactionClient {
  if (!(ctx instanceof PrismaTransactionContext)) {
    throw new Error('El contexto de transacción no es de Prisma');
  }
  return ctx.tx;
}

@Injectable()
export class PrismaTransactionRunner implements TransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => work(new PrismaTransactionContext(tx)));
  }
}
