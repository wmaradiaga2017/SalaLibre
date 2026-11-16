import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AUDIT_REPOSITORY } from './domain/audit.repository';
import { PrismaAuditRepository } from './infrastructure/prisma-audit.repository';

/**
 * Auditoría (O4, D-05, D-24). No importa ningún módulo de negocio, así cualquiera puede importarlo sin crear ciclos.
 * Los demás módulos usan solo `AuditService`.
 */
@Module({
  controllers: [AuditController],
  providers: [AuditService, { provide: AUDIT_REPOSITORY, useClass: PrismaAuditRepository }],
  exports: [AuditService],
})
export class AuditModule {}
