import { hashSync } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../src/common/errors/app-error';
import type { TransactionContext, TransactionRunner } from '../../src/common/transaction/transaction-runner';
import {
  toPublicUser,
  type NewUser,
  type PublicUser,
  type UserChanges,
  type UserWithCredentials,
} from '../../src/modules/users/domain/user';
import type { UsersRepository } from '../../src/modules/users/domain/users.repository';

export const TEST_PASSWORD = 'Empleado12345';

/** Usuarios de prueba en memoria (mismos correos que el seed). */
export function testUsers(): UserWithCredentials[] {
  const passwordHash = hashSync(TEST_PASSWORD, 4);
  return [
    {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'admin@salalibre.local',
      name: 'Administrador RRHH',
      role: 'ADMIN',
      isActive: true,
      passwordHash,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'empleado1@salalibre.local',
      name: 'Empleado Uno',
      role: 'EMPLOYEE',
      isActive: true,
      passwordHash,
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'inactivo@salalibre.local',
      name: 'Empleado Inactivo',
      role: 'EMPLOYEE',
      isActive: false,
      passwordHash,
    },
  ];
}

export class InMemoryUsersRepository implements UsersRepository {
  constructor(readonly users: UserWithCredentials[] = testUsers()) {}

  async findByEmail(email: string): Promise<UserWithCredentials | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<UserWithCredentials | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findAll(): Promise<PublicUser[]> {
    return [...this.users].sort((a, b) => a.name.localeCompare(b.name)).map(toPublicUser);
  }

  /** Emula el índice único de `users.email` (RN-23) y el CHECK de minúsculas de la base. */
  async create(ctx: TransactionContext, user: NewUser): Promise<PublicUser> {
    assertTx(ctx, 'create');
    if (user.email !== user.email.toLowerCase()) {
      throw new Error('CHECK users_email_lowercase_check: el correo debe llegar en minúsculas');
    }
    if (this.users.some((u) => u.email === user.email)) {
      throw new AppError('EMAIL_TAKEN', 'Ya existe un usuario con ese correo.');
    }
    const created: UserWithCredentials = { id: randomUUID(), ...user, isActive: true };
    this.users.push(created);
    return toPublicUser(created);
  }

  async update(ctx: TransactionContext, id: string, changes: UserChanges): Promise<PublicUser> {
    assertTx(ctx, 'update');
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new AppError('NOT_FOUND', 'El usuario no existe.');
    }
    // Como Prisma: un campo `undefined` no se toca (el DTO define los campos opcionales ausentes como `undefined`).
    Object.assign(user, Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)));
    return toPublicUser(user);
  }

  async updatePasswordHash(ctx: TransactionContext, id: string, passwordHash: string): Promise<void> {
    assertTx(ctx, 'updatePasswordHash');
    const user = this.users.find((u) => u.id === id);
    if (user) {
      user.passwordHash = passwordHash;
    }
  }
}

function assertTx(ctx: TransactionContext, operation: string): void {
  if (!(ctx instanceof InMemoryTransactionContext)) {
    throw new Error(`${operation} fuera de una transacción`);
  }
}

class InMemoryTransactionContext implements TransactionContext {
  async advisoryLock(): Promise<void> {}
}

/** Runner sin base: ejecuta el trabajo con un contexto propio y cuenta las transacciones. */
export class InMemoryTransactionRunner implements TransactionRunner {
  runs = 0;

  run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    this.runs += 1;
    return work(new InMemoryTransactionContext());
  }
}
