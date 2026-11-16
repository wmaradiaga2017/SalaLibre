import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { TransactionModule } from './common/transaction/transaction.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { UsersAdminModule } from './modules/users/users-admin.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    CommonModule.forRoot(),
    PrismaModule,
    TransactionModule,
    HealthModule,
    UsersModule,
    AuthModule,
    RoomsModule,
    BookingsModule,
    UsersAdminModule,
  ],
})
export class AppModule {}
