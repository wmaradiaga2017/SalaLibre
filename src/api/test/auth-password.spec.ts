import type { INestApplication } from '@nestjs/common';
import { capture, createApp, json, sessionCookie } from './support/auth-app';
import {
  InMemoryTransactionRunner,
  InMemoryUsersRepository,
  TEST_PASSWORD,
} from './support/in-memory-users.repository';

describe('Cambio de contraseña propio (T03a)', () => {
  const NEW_PASSWORD = 'Nueva12345';
  let app: INestApplication;
  let baseUrl: string;
  let repo: InMemoryUsersRepository;
  let runner: InMemoryTransactionRunner;
  let logs: ReturnType<typeof capture>;

  const login = (email: string, password: string) =>
    fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  const changePassword = (body: unknown, cookie?: string) =>
    fetch(`${baseUrl}/auth/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '8h';
    // Con NODE_ENV=test el logger está en silent; aquí se necesitan los logs reales para revisar que no hay secretos.
    process.env.NODE_ENV = 'development';
    repo = new InMemoryUsersRepository();
    runner = new InMemoryTransactionRunner();
    logs = capture();
    ({ app, baseUrl } = await createApp(repo, { logStream: logs.stream, runner }));
  });

  afterAll(async () => {
    await app.close();
    process.env.NODE_ENV = 'test';
  });

  it('RN-18 · actual correcta y nueva de 8+ caracteres → 204; entra con la nueva y no con la anterior', async () => {
    const cookie = sessionCookie(await login('empleado1@salalibre.local', TEST_PASSWORD));
    const runsBefore = runner.runs;

    const res = await changePassword({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD }, cookie);
    const withNew = await login('empleado1@salalibre.local', NEW_PASSWORD);
    const withOld = await login('empleado1@salalibre.local', TEST_PASSWORD);
    const sameSession = await fetch(`${baseUrl}/auth/me`, { headers: { Cookie: cookie } });

    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(runner.runs).toBe(runsBefore + 1); // la escritura va en una transacción
    expect(withNew.status).toBe(200);
    expect(withOld.status).toBe(401);
    expect(sameSession.status).toBe(200); // T03a: no se invalidan las sesiones abiertas

    // Revierte para los demás casos.
    const back = await changePassword({ currentPassword: NEW_PASSWORD, newPassword: TEST_PASSWORD }, cookie);
    expect(back.status).toBe(204);
  });

  it('RN-18 · contraseña actual incorrecta → 422 INVALID_CURRENT_PASSWORD y la contraseña no cambia', async () => {
    const cookie = sessionCookie(await login('empleado1@salalibre.local', TEST_PASSWORD));
    const user = repo.users.find((u) => u.email === 'empleado1@salalibre.local')!;
    const hashBefore = user.passwordHash;

    const res = await changePassword({ currentPassword: 'mala-clave', newPassword: NEW_PASSWORD }, cookie);
    const body = await json(res);

    expect(res.status).toBe(422);
    expect(body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    expect(user.passwordHash).toBe(hashBefore);
    expect((await login('empleado1@salalibre.local', TEST_PASSWORD)).status).toBe(200);
  });

  it('RN-18 · nueva de menos de 8 caracteres, campos faltantes o extra → 400 VALIDATION_ERROR', async () => {
    const cookie = sessionCookie(await login('empleado1@salalibre.local', TEST_PASSWORD));
    const bodies = [
      { currentPassword: TEST_PASSWORD, newPassword: 'corta' },
      { currentPassword: TEST_PASSWORD },
      { newPassword: NEW_PASSWORD },
      { currentPassword: '', newPassword: NEW_PASSWORD },
      { currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD, extra: 1 },
    ];

    const responses = await Promise.all(bodies.map((b) => changePassword(b, cookie)));
    const codes = await Promise.all(responses.map(async (r) => (await json(r)).error.code));

    expect(responses.map((r) => r.status)).toEqual([400, 400, 400, 400, 400]);
    expect(new Set(codes)).toEqual(new Set(['VALIDATION_ERROR']));
    expect((await login('empleado1@salalibre.local', TEST_PASSWORD)).status).toBe(200);
  });

  it('RN-21 · sin sesión → 401 UNAUTHENTICATED', async () => {
    const res = await changePassword({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe('UNAUTHENTICATED');
  });

  it('RN-18 · respuestas y logs del cambio de contraseña no contienen contraseñas ni hashes', async () => {
    const cookie = sessionCookie(await login('empleado1@salalibre.local', TEST_PASSWORD));
    const user = repo.users.find((u) => u.email === 'empleado1@salalibre.local')!;
    const responses = [
      await changePassword({ currentPassword: 'mala-clave', newPassword: NEW_PASSWORD }, cookie),
      await changePassword({ currentPassword: TEST_PASSWORD, newPassword: 'corta' }, cookie),
      await changePassword({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD }, cookie),
    ];
    const newHash = user.passwordHash;
    await changePassword({ currentPassword: NEW_PASSWORD, newPassword: TEST_PASSWORD }, cookie);
    const bodies = (await Promise.all(responses.map((r) => r.text()))).join('\n');
    const output = `${bodies}\n${logs.text()}`;

    expect(output).toMatch(/password_change/); // los eventos sí quedan en los logs
    for (const secret of [TEST_PASSWORD, NEW_PASSWORD, 'mala-clave', 'corta', newHash, user.passwordHash]) {
      expect(output).not.toContain(secret);
    }
  });
});
