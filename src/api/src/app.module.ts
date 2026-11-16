import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { TransactionModule } from './common/transaction/transaction.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [CommonModule.forRoot(), PrismaModule, TransactionModule, HealthModule, UsersModule, AuthModule, RoomsModule],
})
export class AppModule {}
