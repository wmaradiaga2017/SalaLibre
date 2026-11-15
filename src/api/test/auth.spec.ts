import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Writable } from 'node:stream';
import { CommonModule } from '../src/common/common.module';
import { configureApp } from '../src/common/configure-app';
import { AuthModule } from '../src/modules/auth/auth.module';
import { USERS_REPOSITORY } from '../src/modules/users/domain/users.repository';
import { AuthTestController } from './support/auth-test.controller';
import { InMemoryUsersRepository, TEST_PASSWORD } from './support/in-memory-users.repository';

interface ErrorResponse {
  error: { code: string; message: string; requestId: string };
}

async function json<T = ErrorResponse>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

const silent = () =>
  new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

async function createApp(repo: InMemoryUsersRepository) {
  const moduleRef = await Test.createTestingModule({
    imports: [CommonModule.forRoot({ logStream: silent() }), AuthModule],
    controllers: [AuthTestController],
  })
    .overrideProvider(USERS_REPOSITORY)
    .useValue(repo)
    .compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  return { app, baseUrl: `${await app.getUrl()}/api`, jwt: moduleRef.get(JwtService) };
}

/** Devuelve el valor `access_token=<jwt>` de un Set-Cookie. */
function sessionCookie(res: Response): string {
  const header = res.headers.getSetCookie().find((c) => c.startsWith('access_token='));
  return header?.split(';')[0] ?? '';
}

describe('Auth (T03)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let jwt: JwtService;
  let repo: InMemoryUsersRepository;

  const login = (email: string, password: string) =>
    fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '8h';
    process.env.NODE_ENV = 'test';
    repo = new InMemoryUsersRepository();
    ({ app, baseUrl, jwt } = await createApp(repo));
  });

  afterAll(async () => {
    await app.close();
  });

  it('RN-19 · login correcto → 200 con User sin hash y cookie HttpOnly; SameSite=Strict; Path=/api', async () => {
    const res = await login('Empleado1@SalaLibre.local', TEST_PASSWORD);
    const body = await json<Record<string, unknown>>(res);
    const setCookie = res.headers.getSetCookie().find((c) => c.startsWith('access_token=')) ?? '';

    expect(res.status).toBe(200);
    expect(body).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      email: 'empleado1@salalibre.local',
      name: 'Empleado Uno',
      role: 'EMPLOYEE',
      isActive: true,
    });
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    expect(setCookie).toMatch(/Path=\/api(;|$)/);
    expect(setCookie).toMatch(/Expires=/);
  });

  it('RN-14 · contraseña incorrecta, correo inexistente o usuario inactivo → 401 INVALID_CREDENTIALS con el mismo mensaje', async () => {
    const responses = await Promise.all([
      login('empleado1@salalibre.local', 'mala-clave'),
      login('nadie@salalibre.local', TEST_PASSWORD),
      login('inactivo@salalibre.local', TEST_PASSWORD),
    ]);
    const bodies = await Promise.all(responses.map((r) => json(r)));

    expect(responses.map((r) => r.status)).toEqual([401, 401, 401]);
    expect(bodies.map((b) => b.error.code)).toEqual(['INVALID_CREDENTIALS', 'INVALID_CREDENTIALS', 'INVALID_CREDENTIALS']);
    expect(new Set(bodies.map((b) => b.error.message)).size).toBe(1);
    expect(responses.every((r) => r.headers.getSetCookie().length === 0)).toBe(true);
  });

  it('D-06 · login con body inválido → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'no-es-correo', password: TEST_PASSWORD, extra: 1 }),
    });

    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe('VALIDATION_ERROR');
  });

  it('D-03 · GET /auth/me con cookie → 200 con el usuario; sin cookie → 401 UNAUTHENTICATED', async () => {
    const cookie = sessionCookie(await login('admin@salalibre.local', TEST_PASSWORD));
    const me = await fetch(`${baseUrl}/auth/me`, { headers: { Cookie: cookie } });
    const anonymous = await fetch(`${baseUrl}/auth/me`);

    expect(me.status).toBe(200);
    expect(await json<Record<string, unknown>>(me)).toMatchObject({ email: 'admin@salalibre.local', role: 'ADMIN' });
    expect(anonymous.status).toBe(401);
    expect((await json(anonymous)).error.code).toBe('UNAUTHENTICATED');
  });

  it('RN-14 · usuario desactivado con cookie vigente → 401 UNAUTHENTICATED en cualquier ruta', async () => {
    const cookie = sessionCookie(await login('empleado1@salalibre.local', TEST_PASSWORD));
    const user = repo.users.find((u) => u.email === 'empleado1@salalibre.local')!;
    user.isActive = false;
    try {
      const me = await fetch(`${baseUrl}/auth/me`, { headers: { Cookie: cookie } });
      const other = await fetch(`${baseUrl}/test-auth/private`, { headers: { Cookie: cookie } });

      expect([me.status, other.status]).toEqual([401, 401]);
      expect((await json(me)).error.code).toBe('UNAUTHENTICATED');
    } finally {
      user.isActive = true;
    }
  });

  it('RN-19 · JWT vencido o con firma inválida → 401 UNAUTHENTICATED; el payload solo lleva sub y role', async () => {
    const valid = sessionCookie(await login('empleado1@salalibre.local', TEST_PASSWORD)).split('=')[1];
    const payload = jwt.decode<Record<string, unknown>>(valid);
    const expired = jwt.sign({ sub: payload.sub, role: payload.role }, { expiresIn: -10 });
    const forged = jwt.sign({ sub: payload.sub, role: 'ADMIN' }, { secret: 'otra-clave' });

    const responses = await Promise.all(
      [expired, forged, 'no-es-un-jwt'].map((t) =>
        fetch(`${baseUrl}/auth/me`, { headers: { Cookie: `access_token=${t}` } }),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual([401, 401, 401]);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'role', 'sub']);
    expect((payload.exp as number) - (payload.iat as number)).toBe(8 * 60 * 60);
  });

  it('S-01 · logout con sesión → 204 y la cookie queda borrada; sin sesión → 401', async () => {
    const cookie = sessionCookie(await login('empleado1@salalibre.local', TEST_PASSWORD));
    const res = await fetch(`${baseUrl}/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
    const cleared = res.headers.getSetCookie().find((c) => c.startsWith('access_token=')) ?? '';
    const anonymous = await fetch(`${baseUrl}/auth/logout`, { method: 'POST' });

    expect(res.status).toBe(204);
    expect(cleared).toMatch(/^access_token=;/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cleared).toMatch(/Path=\/api/);
    expect(anonymous.status).toBe(401);
  });

  it('RN-21 · ruta sin @Public() sin sesión → 401; @Roles(ADMIN) con EMPLOYEE → 403 FORBIDDEN; con ADMIN → 200', async () => {
    const employee = sessionCookie(await login('empleado1@salalibre.local', TEST_PASSWORD));
    const admin = sessionCookie(await login('admin@salalibre.local', TEST_PASSWORD));

    const noSession = await fetch(`${baseUrl}/test-auth/private`);
    const noSessionAdmin = await fetch(`${baseUrl}/test-auth/admin`);
    const forbidden = await fetch(`${baseUrl}/test-auth/admin`, { headers: { Cookie: employee } });
    const allowed = await fetch(`${baseUrl}/test-auth/admin`, { headers: { Cookie: admin } });
    const privateOk = await fetch(`${baseUrl}/test-auth/private`, { headers: { Cookie: employee } });

    expect(noSession.status).toBe(401);
    expect(noSessionAdmin.status).toBe(401); // D-32: 401 antes que 403
    expect(forbidden.status).toBe(403);
    expect((await json(forbidden)).error.code).toBe('FORBIDDEN');
    expect(allowed.status).toBe(200);
    expect(privateOk.status).toBe(200);
  });
});

describe('Swagger en producción (T03, D-33)', () => {
  it('D-33 · con NODE_ENV=production, /api/docs → 404 NOT_FOUND', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { app, baseUrl } = await createApp(new InMemoryUsersRepository());
    try {
      const res = await fetch(`${baseUrl}/docs`);

      expect(res.status).toBe(404);
      expect((await json(res)).error.code).toBe('NOT_FOUND');
    } finally {
      await app.close();
      process.env.NODE_ENV = previous;
    }
  });
});
