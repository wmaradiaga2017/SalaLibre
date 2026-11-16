import { Injectable } from '@nestjs/common';
import { prismaTx } from '../../../common/transaction/prisma-transaction-runner';
import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuditItem, AuditQuery, AuditRecord } from '../domain/audit';
import type { AuditRepository } from '../domain/audit.repository';

const SELECT = {
  id: true,
  createdAt: true,
  action: true,
  entity: true,
  entityId: true,
  requestId: true,
  actor: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insertMany(ctx: TransactionContext, records: AuditRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }
    // Un solo INSERT para las cancelaciones en cascada (RN-15, RN-16), en la misma transacción (D-05).
    await prismaTx(ctx).auditLog.createMany({
      data: records.map((r) => ({
        actorId: r.actorId,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        data: r.data as Prisma.InputJsonObject,
        requestId: r.requestId,
      })),
    });
  }

  async search(query: AuditQuery): Promise<{ items: AuditItem[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      action: query.action,
      createdAt: query.from || query.to ? { gte: query.from, lt: query.to } : undefined,
    };
    // Las filas de una misma transacción comparten `created_at` (now()): el id desempata para que las páginas no
    // repitan ni salten filas.
    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: SELECT,
      }),
    ]);
    return { total, items };
  }
}
