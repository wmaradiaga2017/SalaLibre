import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BOOKINGS_REPOSITORY } from './domain/bookings.repository';
import { PrismaBookingsRepository } from './infrastructure/prisma-bookings.repository';

@Module({
  imports: [RoomsModule, UsersModule],
  controllers: [BookingsController],
  providers: [BookingsService, { provide: BOOKINGS_REPOSITORY, useClass: PrismaBookingsRepository }],
  exports: [BookingsService],
})
export class BookingsModule {}
