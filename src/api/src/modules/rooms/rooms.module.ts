import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ROOMS_REPOSITORY } from './domain/rooms.repository';
import { PrismaRoomsRepository } from './infrastructure/prisma-rooms.repository';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [AuditModule],
  controllers: [RoomsController],
  providers: [RoomsService, { provide: ROOMS_REPOSITORY, useClass: PrismaRoomsRepository }],
  exports: [RoomsService],
})
export class RoomsModule {}
