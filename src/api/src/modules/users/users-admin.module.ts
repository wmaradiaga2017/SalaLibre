import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BookingsModule } from '../bookings/bookings.module';
import { UsersController } from './users.controller';
import { UsersAdminService } from './users-admin.service';
import { UsersModule } from './users.module';

/**
 * Rutas `/users` del ADMIN (F-06). Va separado de `UsersModule` para no crear un ciclo: `BookingsModule` importa
 * `UsersModule` (relectura del usuario al reservar) y la desactivación necesita `BookingsService` (RN-15).
 */
@Module({
  imports: [UsersModule, BookingsModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersAdminService],
})
export class UsersAdminModule {}
