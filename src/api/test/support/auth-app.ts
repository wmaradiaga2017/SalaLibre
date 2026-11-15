import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Writable } from 'node:stream';
import { CommonModule } from '../../src/common/common.module';
import { configureApp } from '../../src/common/configure-app';
import { TRANSACTION_RUNNER } from '../../src/common/transaction/transaction-runner';
import { TransactionModule } from '../../src/common/transaction/transaction.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { USERS_REPOSITORY } from '../../src/modules/users/domain/users.repository';
import { AuthTestController } from './auth-test.controller';
import { InMemoryTransactionRunner, type InMemoryUsersRepository } from './in-memory-users.repository';

/** Utilidades compartidas por las pruebas HTTP de auth (T03, T03a), sin base de datos. */

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

export async function createApp(
  repo: InMemoryUsersRepository,
  options: { logStream?: Writable; runner?: InMemoryTransactionRunner } = {},
) {
  const moduleRef = await Test.createTestingModule({
    imports: [CommonModule.forRoot({ logStream: options.logStream ?? silent() }), TransactionModule, AuthModule],
    controllers: [AuthTestController],
  })
    .overrideProvider(USERS_REPOSITORY)
    .useValue(repo)
    .overrideProvider(TRANSACTION_RUNNER)
    .useValue(options.runner ?? new InMemoryTransactionRunner())
    .compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  return { app, baseUrl: `${await app.getUrl()}/api`, jwt: moduleRef.get(JwtService) };
}

/** Devuelve el valor `access_token=<jwt>` de un Set-Cookie. */
export function sessionCookie(res: Response): string {
  const header = res.headers.getSetCookie().find((c) => c.startsWith('access_token='));
  return header?.split(';')[0] ?? '';
}
