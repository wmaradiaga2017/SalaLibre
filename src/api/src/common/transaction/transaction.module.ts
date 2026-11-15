import { Global, Module } from '@nestjs/common';
import { PrismaTransactionRunner } from './prisma-transaction-runner';
import { TRANSACTION_RUNNER } from './transaction-runner';

@Global()
@Module({
  providers: [{ provide: TRANSACTION_RUNNER, useClass: PrismaTransactionRunner }],
  exports: [TRANSACTION_RUNNER],
})
export class TransactionModule {}
