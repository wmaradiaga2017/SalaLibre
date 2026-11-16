import { Injectable } from '@nestjs/common';
import { AppError } from '../../../common/errors/app-error';
import { prismaTx } from '../../../common/transaction/prisma-transaction-runner';
import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { Closure, NewClosure } from '../domain/closure';
import type { ClosuresRepository } from '../domain/closures.repository';

const SELECT = { id: true, date: true, reason: true } as const;

/** La columna `date` (`@db.Date`) llega a Prisma como medianoche UTC: se convierte a y desde `AAAA-MM-DD` sin zona. */
const toDb = (date: string) => new Date(`${date}T00:00:00.000Z`);
const fromDb = (row: { id: string; date: Date; reason: string }): Closure => ({
  id: row.id,
  date: row.date.toISOString().slice(0, 10),
  reason: row.reason,
});

@Injectable()
export class PrismaClosuresRepository implements ClosuresRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listFrom(from: string): Promise<Closure[]> {
    const rows = await this.prisma.closure.findMany({
      where: { date: { gte: toDb(from) } },
      orderBy: { date: 'asc' },
      select: SELECT,
    });
    return rows.map(fromDb);
  }

  async findById(id: string, ctx?: TransactionContext): Promise<Closure | null> {
    const client = ctx ? prismaTx(ctx) : this.prisma;
    const row = await client.closure.findUnique({ where: { id }, select: SELECT });
    return row ? fromDb(row) : null;
  }

  async create(ctx: TransactionContext, closure: NewClosure): Promise<Closure> {
    try {
      const row = await prismaTx(ctx).closure.create({
        data: { date: toDb(closure.date), reason: closure.reason, createdById: closure.createdById },
        select: SELECT,
      });
      return fromDb(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // RN-24: el índice único `closures_date_key` es el único además de la PK.
        throw new AppError('CLOSURE_EXISTS', 'Esa fecha ya está registrada como día cerrado.');
      }
      throw error;
    }
  }

  async delete(ctx: TransactionContext, id: string): Promise<boolean> {
    const { count } = await prismaTx(ctx).closure.deleteMany({ where: { id } });
    return count > 0;
  }
}
