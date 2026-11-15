import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lanza un error si la base no responde. */
  async check(): Promise<{ status: 'ok' }> {
    await this.prisma.ping();
    return { status: 'ok' };
  }
}
