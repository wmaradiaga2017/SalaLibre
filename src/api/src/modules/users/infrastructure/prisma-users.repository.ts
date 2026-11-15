import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { UserWithCredentials } from '../domain/user';
import type { UsersRepository } from '../domain/users.repository';

const SELECT = { id: true, email: true, name: true, role: true, isActive: true, passwordHash: true } as const;

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findUnique({ where: { email }, select: SELECT });
  }

  async findById(id: string): Promise<UserWithCredentials | null> {
    if (!UUID.test(id)) {
      return null; // evita un error de Postgres por un `sub` que no es uuid
    }
    return this.prisma.user.findUnique({ where: { id }, select: SELECT });
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
