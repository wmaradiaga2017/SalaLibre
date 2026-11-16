import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BookingsModule } from '../bookings/bookings.module';
import { ClosuresController } from './closures.controller';
import { ClosuresService } from './closures.service';
import { CLOSURES_REPOSITORY } from './domain/closures.repository';
import { PrismaClosuresRepository } from './infrastructure/prisma-closures.repository';

/**
 * F-07. Importa `BookingsModule` para la cancelación en cascada (RN-16). El módulo de reservas no importa este: RN-10
 * (`DAY_CLOSED`) la consulta `BookingsRepository.isDateClosed` dentro de su transacción, para no crear un ciclo.
 */
@Module({
  imports: [BookingsModule, AuditModule],
  controllers: [ClosuresController],
  providers: [ClosuresService, { provide: CLOSURES_REPOSITORY, useClass: PrismaClosuresRepository }],
  exports: [ClosuresService],
})
export class ClosuresModule {}
