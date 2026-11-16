import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsISO8601, IsString, Matches, Max, Min } from 'class-validator';
import { OptionalNotNull } from '../../../common/validation/decorators';
import { AUDIT_ACTIONS, AUDIT_PAGE, type AuditAction } from '../domain/audit';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Body de `POST /audit-logs/search` (D-24: los filtros viajan en el body, nunca en la URL). Todos los campos son
 * opcionales; `null` → 400 "no puede ser null". RN-25: `page` ≥ 1, `pageSize` 1–100.
 */
export class AuditSearchDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: AUDIT_PAGE.defaultPage })
  @OptionalNotNull()
  @IsInt()
  @Min(1)
  @Max(AUDIT_PAGE.pageMax)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: AUDIT_PAGE.pageSizeMax, default: AUDIT_PAGE.defaultPageSize })
  @OptionalNotNull()
  @IsInt()
  @Min(1)
  @Max(AUDIT_PAGE.pageSizeMax)
  pageSize?: number;

  @ApiPropertyOptional({ example: '2026-11-01', description: 'AAAA-MM-DD en BUSINESS_TZ, incluido' })
  @OptionalNotNull()
  @IsString()
  @Matches(DATE)
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'AAAA-MM-DD en BUSINESS_TZ, incluido' })
  @OptionalNotNull()
  @IsString()
  @Matches(DATE)
  @IsISO8601({ strict: true })
  to?: string;

  @ApiPropertyOptional({ enum: AUDIT_ACTIONS })
  @OptionalNotNull()
  @IsIn(AUDIT_ACTIONS)
  action?: AuditAction;
}
