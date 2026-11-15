import { hashSync } from 'bcryptjs';
import type { TransactionContext, TransactionRunner } from '../../src/common/transaction/transaction-runner';
import type { UserWithCredentials } from '../../src/modules/users/domain/user';
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

  async updatePasswordHash(ctx: TransactionContext, id: string, passwordHash: string): Promise<void> {
    if (!(ctx instanceof InMemoryTransactionContext)) {
      throw new Error('updatePasswordHash fuera de una transacción');
    }
    const user = this.users.find((u) => u.id === id);
    if (user) {
      user.passwordHash = passwordHash;
    }
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
