import type { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Writable } from 'node:stream';
import { CommonModule } from '../../src/common/common.module';
import { configureApp } from '../../src/common/configure-app';
import { TRANSACTION_RUNNER } from '../../src/common/transaction/transaction-runner';
import { TransactionModule } from '../../src/common/transaction/transaction.module';
import { AUDIT_REPOSITORY } from '../../src/modules/audit/domain/audit.repository';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { USERS_REPOSITORY } from '../../src/modules/users/domain/users.repository';
import { AuthTestController } from './auth-test.controller';
import { InMemoryAuditRepository } from './in-memory-audit.repository';
import { InMemoryTransactionRunner, type InMemoryUsersRepository } from './in-memory-users.repository';

/** Utilidades compartidas por las pruebas HTTP (auth y módulos de negocio), sin base de datos. */

export interface ErrorResponse {
  error: { code: string; message: string; requestId: string };
}

export async function json<T = ErrorResponse>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export const silent = () =>
  new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

/** Destino de logs que guarda todo lo escrito, para comprobar que no hay secretos. */
export function capture() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return { stream, text: () => chunks.join('') };
}

export interface CreateAppOptions {
  logStream?: Writable;
  runner?: InMemoryTransactionRunner;
  /** Repositorio de auditoría en memoria (T06a); por defecto, uno nuevo. */
  audit?: InMemoryAuditRepository;
  /** Módulos de negocio adicionales (por ejemplo `RoomsModule`). */
  modules?: Type[];
  /** Reemplazos de providers por token (repositorios en memoria). */
  overrides?: { token: symbol; value: unknown }[];
}

export async function createApp(repo: InMemoryUsersRepository, options: CreateAppOptions = {}) {
  let builder = Test.createTestingModule({
    imports: [
      CommonModule.forRoot({ logStream: options.logStream ?? silent() }),
      TransactionModule,
      AuthModule,
      ...(options.modules ?? []),
    ],
    controllers: [AuthTestController],
  })
    .overrideProvider(USERS_REPOSITORY)
    .useValue(repo)
    .overrideProvider(TRANSACTION_RUNNER)
    .useValue(options.runner ?? new InMemoryTransactionRunner())
    .overrideProvider(AUDIT_REPOSITORY)
    .useValue(options.audit ?? new InMemoryAuditRepository());
  for (const { token, value } of options.overrides ?? []) {
    builder = builder.overrideProvider(token).useValue(value);
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true, rawBody: true });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  return { app, baseUrl: `${await app.getUrl()}/api`, jwt: moduleRef.get(JwtService) };
}

/** Devuelve el valor `access_token=<jwt>` de un Set-Cookie. */
export function sessionCookie(res: Response): string {
  const header = res.headers.getSetCookie().find((c) => c.startsWith('access_token='));
  return header?.split(';')[0] ?? '';
}
