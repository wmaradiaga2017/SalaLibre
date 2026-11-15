import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Cliente Prisma compartido. Solo lo usan los repositorios Prisma, el futuro TransactionRunner (T02a)
 * y el chequeo de salud. Los controllers nunca lo importan (CLAUDE.md, Arquitectura del backend).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Falta la variable de entorno DATABASE_URL');
    }
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  /** Comprueba que la base responde. */
  async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
