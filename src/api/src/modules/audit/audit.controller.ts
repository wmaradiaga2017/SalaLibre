import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { AuditService } from './audit.service';
import type { AuditPage } from './domain/audit';
import { AuditSearchDto } from './dto/audit-search.dto';

/**
 * F-08 · Consulta de auditoría, solo ADMIN (RN-21, RN-25). Es una lectura vía `POST` (D-24): los filtros y la página
 * van en el body y nunca en la URL. No hay `GET` ni rutas que modifiquen `audit_logs` (D-05).
 */
@ApiTags('audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles('ADMIN')
  @Post('search')
  @HttpCode(200)
  search(@Body() body: AuditSearchDto): Promise<AuditPage> {
    return this.audit.search(body);
  }
}
