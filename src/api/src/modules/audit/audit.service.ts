import { Inject, Injectable } from '@nestjs/common';
import { BUSINESS_CONFIG, type BusinessConfig } from '../../common/config/business-config';
import { currentRequestContext } from '../../common/request-context/request-context';
import { addDays, startOfLocalDay } from '../../common/time/zoned-time';
import type { TransactionContext } from '../../common/transaction/transaction-runner';
import { AUDIT_PAGE, compactData, secretKeys, type AuditAction, type AuditEntry, type AuditPage, type AuditRecord } from './domain/audit';
import { AUDIT_REPOSITORY, type AuditRepository } from './domain/audit.repository';

export interface AuditSearchInput {
  page?: number;
  pageSize?: number;
  /** `AAAA-MM-DD` en `BUSINESS_TZ`, incluido. */
  from?: string;
  /** `AAAA-MM-DD` en `BUSINESS_TZ`, incluido. */
  to?: string;
  action?: AuditAction;
}

/**
 * API pública del módulo de auditoría (O4, D-05, D-24). Los demás módulos llaman a `record` dentro de su
 * `TransactionRunner.run`, así la fila se confirma o se revierte junto con la escritura de negocio.
 */
@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly audit: AuditRepository,
    @Inject(BUSINESS_CONFIG) private readonly config: BusinessConfig,
  ) {}

  /** Inserta una fila con el actor de la sesión y el request ID de la petición en curso. */
  record(ctx: TransactionContext, entry: AuditEntry): Promise<void> {
    return this.recordMany(ctx, [entry]);
  }

  /** Una fila por entrada, en un solo `INSERT` (cancelaciones en cascada de RN-15 y RN-16). */
  async recordMany(ctx: TransactionContext, entries: AuditEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    const request = currentRequestContext();
    // Fallar cerrado: sin request ID o sin actor la fila no sería trazable, así que la escritura entera se revierte.
    if (!request?.requestId || !request.actorId) {
      throw new Error('Auditoría sin contexto de petición: falta el request ID o el usuario de la sesión');
    }
    const records: AuditRecord[] = entries.map((e) => {
      const data = compactData(e.data ?? {});
      const secrets = secretKeys(data);
      if (secrets.length > 0) {
        throw new Error(`La auditoría no puede guardar secretos (${secrets.join(', ')})`);
      }
      return { ...e, data, actorId: request.actorId as string, requestId: request.requestId };
    });
    await this.audit.insertMany(ctx, records);
  }

  /** `POST /audit-logs/search` (RN-25, D-24). `from` y `to` son días de `BUSINESS_TZ`, ambos incluidos. */
  async search(input: AuditSearchInput): Promise<AuditPage> {
    const page = input.page ?? AUDIT_PAGE.defaultPage;
    const pageSize = input.pageSize ?? AUDIT_PAGE.defaultPageSize;
    const tz = this.config.timeZone;
    const { items, total } = await this.audit.search({
      page,
      pageSize,
      from: input.from ? startOfLocalDay(input.from, tz) : undefined,
      to: input.to ? startOfLocalDay(addDays(input.to, 1), tz) : undefined,
      action: input.action,
    });
    return { items, page, pageSize, total };
  }
}
