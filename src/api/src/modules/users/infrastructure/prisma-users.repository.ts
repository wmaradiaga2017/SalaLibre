import { Injectable } from '@nestjs/common';
import { AppError } from '../../../common/errors/app-error';
import { prismaTx } from '../../../common/transaction/prisma-transaction-runner';
import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { NewUser, PublicUser, UserChanges, UserWithCredentials } from '../domain/user';
import type { UsersRepository } from '../domain/users.repository';

const SELECT = { id: true, email: true, name: true, role: true, isActive: true, passwordHash: true } as const;
/** Lo que se devuelve fuera de la autenticación: nunca el hash (A02). */
const PUBLIC = { id: true, email: true, name: true, role: true, isActive: true } as const;

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findUnique({ where: { email }, select: SELECT });
  }

  async findById(id: string, ctx?: TransactionContext): Promise<UserWithCredentials | null> {
    if (!UUID.test(id)) {
      return null; // evita un error de Postgres por un `sub` que no es uuid
    }
    const client = ctx ? prismaTx(ctx) : this.prisma;
    return client.user.findUnique({ where: { id }, select: SELECT });
  }

  findAll(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({ orderBy: [{ name: 'asc' }, { email: 'asc' }], select: PUBLIC });
  }

  async create(ctx: TransactionContext, user: NewUser): Promise<PublicUser> {
    try {
      return await prismaTx(ctx).user.create({ data: user, select: PUBLIC });
    } catch (error) {
      throw translate(error);
    }
  }

  async update(ctx: TransactionContext, id: string, changes: UserChanges): Promise<PublicUser> {
    try {
      return await prismaTx(ctx).user.update({ where: { id }, data: changes, select: PUBLIC });
    } catch (error) {
      throw translate(error);
    }
  }

  async updatePasswordHash(ctx: TransactionContext, id: string, passwordHash: string): Promise<void> {
    try {
      await prismaTx(ctx).user.update({ where: { id }, data: { passwordHash }, select: { id: true } });
    } catch (error) {
      throw translate(error);
    }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * RN-23: la unicidad del correo la garantiza el índice único de `users.email` (el correo se guarda en minúsculas y un
 * CHECK lo exige), así que dos altas simultáneas con el mismo correo no pueden pasar. Es el único índice único además
 * de la PK.
 */
function translate(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new AppError('EMAIL_TAKEN', 'Ya existe un usuario con ese correo.');
    }
    if (error.code === 'P2025') {
      return new AppError('NOT_FOUND', 'El usuario no existe.');
    }
  }
  return error;
}
