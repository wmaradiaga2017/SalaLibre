import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { TransactionModule } from './common/transaction/transaction.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [CommonModule.forRoot(), PrismaModule, TransactionModule, HealthModule],
})
export class AppModule {}
