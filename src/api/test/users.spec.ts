import type { INestApplication } from '@nestjs/common';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLOCK } from '../src/common/time/clock';
import type { TransactionContext, TransactionRunner } from '../src/common/transaction/transaction-runner';
import type { BookingsService } from '../src/modules/bookings/bookings.service';
import type { BookingRecord } from '../src/modules/bookings/domain/booking';
import { BOOKINGS_REPOSITORY } from '../src/modules/bookings/domain/bookings.repository';
import { ROOMS_REPOSITORY } from '../src/modules/rooms/domain/rooms.repository';
import type { UserWithCredentials } from '../src/modules/users/domain/user';
import { UsersAdminModule } from '../src/modules/users/users-admin.module';
import { UsersAdminService } from '../src/modules/users/users-admin.service';
import type { UsersService } from '../src/modules/users/users.service';
import { createApp, json, sessionCookie } from './support/auth-app';
import { InMemoryBookingsRepository } from './support/in-memory-bookings.repository';
import { InMemoryRoomsRepository } from './support/in-memory-rooms.repository';
import { InMemoryUsersRepository, TEST_PASSWORD, testUsers } from './support/in-memory-users.repository';

interface UserBody {
  id: string;
  email: string;
  name: string;
  role: 'EMPLOYEE' | 'ADMIN';
  isActive: boolean;
}

// Reloj fijo: lunes 2026-11-16 10:00 en Tegucigalpa (16:00Z).
const NOW = new Date('2026-11-16T16:00:00Z');
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const EMP1_ID = '22222222-2222-4222-8222-222222222222';
const COPAN = 'a1111111-1111-4111-8111-111111111111';
const ROATAN = 'a2222222-2222-4222-8222-222222222222';
const MISSING = 'b9999999-9999-4999-8999-999999999999';

describe('Módulo de usuarios (T05a)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let users: InMemoryUsersRepository;
  let bookings: InMemoryBookingsRepository;
  let admin: string;
  let employee: string;
  let seq = 0;

  const login = (email: string, password = TEST_PASSWORD) =>
    fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  const send = (method: 'GET' | 'POST' | 'PATCH', path: string, cookie?: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const newUser = (extra: Record<string, unknown> = {}) => ({
    name: `Prueba ${++seq}`,
    email: `prueba${seq}@salalibre.local`,
    password: 'Prueba12345',
    role: 'EMPLOYEE',
    ...extra,
  });

  /** Crea un usuario por la API y devuelve su cuerpo. */
  const created = async (extra: Record<string, unknown> = {}) => {
    const res = await send('POST', '/users', admin, newUser(extra));
    expect(res.status).toBe(201);
    return json<UserBody>(res);
  };

  const booking = (userId: string, startAt: string, endAt: string, roomId = COPAN): BookingRecord => {
    const record: BookingRecord = {
      id: `${userId.slice(0, 8)}-${startAt}`,
      roomId,
      roomName: roomId === COPAN ? 'Sala Copán' : 'Sala Roatán',
      userId,
      ownerName: 'x',
      title: 'Demo',
      attendees: 2,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      status: 'CONFIRMED',
      cancelledAt: null,
      cancelledById: null,
      cancelledByName: null,
    };
    bookings.bookings.push(record);
    return record;
  };

  const stored = (id: string) => bookings.bookings.find((b) => b.id === id)!;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '8h';
    process.env.NODE_ENV = 'test';
    users = new InMemoryUsersRepository(testUsers());
    const rooms = new InMemoryRoomsRepository();
    bookings = new InMemoryBookingsRepository(
      (id) => rooms.rooms.find((r) => r.id === id)?.name ?? '?',
      (id) => users.users.find((u) => u.id === id)?.name ?? '?',
    );
    ({ app, baseUrl } = await createApp(users, {
      modules: [UsersAdminModule],
      overrides: [
        { token: ROOMS_REPOSITORY, value: rooms },
        { token: BOOKINGS_REPOSITORY, value: bookings },
        { token: CLOCK, value: { now: () => NOW } },
      ],
    }));
    admin = sessionCookie(await login('admin@salalibre.local'));
    employee = sessionCookie(await login('empleado1@salalibre.local'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('RN-21 · sin sesión → 401 en todas las rutas de /users', async () => {
    const responses = await Promise.all([
      send('GET', '/users'),
      send('POST', '/users', undefined, newUser()),
      send('PATCH', `/users/${EMP1_ID}`, undefined, { name: 'X' }),
      send('POST', `/users/${EMP1_ID}/reset-password`, undefined, { newPassword: 'Nueva12345' }),
    ]);

    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401]);
  });

  it('RN-21 · CA1 · EMPLOYEE → 403 FORBIDDEN en todas las rutas de /users, aunque el body sea inválido', async () => {
    const responses = await Promise.all([
      send('GET', '/users', employee),
      send('POST', '/users', employee, { name: '' }),
      send('PATCH', `/users/${EMP1_ID}`, employee, { email: 'x' }),
      send('POST', `/users/${EMP1_ID}/reset-password`, employee, { newPassword: 'x' }),
    ]);
    const bodies = await Promise.all(responses.map((r) => json(r)));

    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403]);
    expect(bodies.map((b) => b.error.code)).toEqual(['FORBIDDEN', 'FORBIDDEN', 'FORBIDDEN', 'FORBIDDEN']);
  });

  it('RN-21 · CA1 · ADMIN: GET /users → 200 con todos (activos e inactivos) ordenados por name y sin passwordHash', async () => {
    const res = await send('GET', '/users', admin);
    const list = await json<UserBody[]>(res);
    const names = list.map((u) => u.name);

    expect(res.status).toBe(200);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(list.some((u) => !u.isActive)).toBe(true);
    for (const user of list) {
      expect(Object.keys(user).sort()).toEqual(['email', 'id', 'isActive', 'name', 'role']);
    }
  });

  it('RN-23 · CA2 · ADMIN crea un usuario → 201 con el User, correo en minúsculas, activo, y puede iniciar sesión', async () => {
    const res = await send('POST', '/users', admin, {
      name: 'Prueba Uno',
      email: 'Prueba.Uno@SalaLibre.local',
      password: 'Prueba12345',
      role: 'EMPLOYEE',
    });
    const body = await json<UserBody>(res);

    expect(res.status).toBe(201);
    expect(body).toEqual({
      id: expect.any(String),
      email: 'prueba.uno@salalibre.local',
      name: 'Prueba Uno',
      role: 'EMPLOYEE',
      isActive: true,
    });
    expect((await login('prueba.uno@salalibre.local', 'Prueba12345')).status).toBe(200);
    // RN-18 · D-19: se guarda el hash bcryptjs (costo 10), nunca la contraseña.
    expect(users.users.find((u) => u.id === body.id)?.passwordHash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('RN-23 · CA3 · correo repetido sin distinguir mayúsculas → 409 EMAIL_TAKEN y no se crea otro', async () => {
    const before = users.users.length;
    const res = await send('POST', '/users', admin, newUser({ email: 'EMPLEADO1@salalibre.local' }));
    const body = await json(res);

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('EMAIL_TAKEN');
    expect(users.users.length).toBe(before);
  });

  it('RN-18 · CA3 · contraseña corta, correo inválido, nombre vacío o en blanco, rol inválido o campos faltantes → 400', async () => {
    const before = users.users.length;
    const invalid: Record<string, unknown>[] = [
      newUser({ password: 'Corta12' }),
      newUser({ email: 'no-es-correo' }),
      newUser({ name: '' }),
      newUser({ name: '   ' }),
      newUser({ name: 'x'.repeat(101) }),
      newUser({ role: 'SUPERADMIN' }),
      newUser({ role: null }),
      newUser({ isActive: false }),
      { name: 'Sin correo', password: 'Prueba12345', role: 'EMPLOYEE' },
    ];
    const responses = await Promise.all(invalid.map((b) => send('POST', '/users', admin, b)));
    const bodies = await Promise.all(responses.map((r) => json(r)));

    expect(responses.map((r) => r.status)).toEqual(invalid.map(() => 400));
    expect(new Set(bodies.map((b) => b.error.code))).toEqual(new Set(['VALIDATION_ERROR']));
    expect(users.users.length).toBe(before);
  });

  it('CA4 · PATCH { name, role } → 200 con el User; PATCH {} → 200 sin cambios', async () => {
    const user = await created();
    const res = await send('PATCH', `/users/${user.id}`, admin, { name: 'Nombre Nuevo', role: 'ADMIN' });
    const empty = await send('PATCH', `/users/${user.id}`, admin, {});

    expect(res.status).toBe(200);
    expect(await json<UserBody>(res)).toEqual({ ...user, name: 'Nombre Nuevo', role: 'ADMIN' });
    expect(empty.status).toBe(200);
    expect(await json<UserBody>(empty)).toEqual({ ...user, name: 'Nombre Nuevo', role: 'ADMIN' });
  });

  it('RN-23 · CA4 · PATCH con email, password, null o valores inválidos → 400 y el usuario no cambia', async () => {
    const user = await created();
    const invalid: Record<string, unknown>[] = [
      { email: 'otro@salalibre.local' },
      { password: 'Nueva12345' },
      { name: null },
      { role: null },
      { isActive: null },
      { name: '  ' },
      { role: 'ROOT' },
      { isActive: 'no' },
    ];
    const responses = await Promise.all(invalid.map((b) => send('PATCH', `/users/${user.id}`, admin, b)));
    const bodies = await Promise.all(responses.map((r) => json(r)));
    const after = (await json<UserBody[]>(await send('GET', '/users', admin))).find((u) => u.id === user.id);

    expect(responses.map((r) => r.status)).toEqual(invalid.map(() => 400));
    expect(new Set(bodies.map((b) => b.error.code))).toEqual(new Set(['VALIDATION_ERROR']));
    expect(bodies[2].error.message).toContain('name (no puede ser null)');
    expect(after).toEqual(user);
  });

  it('RN-15 · CA5 · desactivar cancela solo sus reservas CONFIRMED futuras, con cancelledBy = el ADMIN', async () => {
    const user = await created();
    const past = booking(user.id, '2026-11-13T16:00:00Z', '2026-11-13T17:00:00Z');
    const ongoing = booking(user.id, '2026-11-16T15:45:00Z', '2026-11-16T16:30:00Z');
    const future1 = booking(user.id, '2026-11-17T16:00:00Z', '2026-11-17T17:00:00Z');
    const future2 = booking(user.id, '2026-11-20T16:00:00Z', '2026-11-20T17:00:00Z', ROATAN);
    const alreadyCancelled = booking(user.id, '2026-11-18T16:00:00Z', '2026-11-18T17:00:00Z');
    Object.assign(alreadyCancelled, { status: 'CANCELLED', cancelledAt: NOW, cancelledById: user.id });
    const other = booking(EMP1_ID, '2026-11-19T16:00:00Z', '2026-11-19T17:00:00Z');

    const res = await send('PATCH', `/users/${user.id}`, admin, { isActive: false });

    expect(res.status).toBe(200);
    expect((await json<UserBody>(res)).isActive).toBe(false);
    for (const b of [future1, future2]) {
      expect(stored(b.id)).toMatchObject({ status: 'CANCELLED', cancelledById: ADMIN_ID, cancelledAt: NOW });
    }
    expect(stored(past.id).status).toBe('CONFIRMED');
    expect(stored(ongoing.id).status).toBe('CONFIRMED');
    expect(stored(alreadyCancelled.id).cancelledById).toBe(user.id);
    expect(stored(other.id).status).toBe('CONFIRMED');
  });

  it('RN-14 · CA6 · usuario desactivado: login → 401 INVALID_CREDENTIALS; su cookie vigente → 401 UNAUTHENTICATED', async () => {
    const user = await created({ password: 'Prueba12345' });
    const cookie = sessionCookie(await login(user.email, 'Prueba12345'));
    expect((await send('GET', '/auth/me', cookie)).status).toBe(200);

    await send('PATCH', `/users/${user.id}`, admin, { isActive: false });
    const relogin = await login(user.email, 'Prueba12345');
    const me = await send('GET', '/auth/me', cookie);

    expect([relogin.status, me.status]).toEqual([401, 401]);
    expect((await json(relogin)).error.code).toBe('INVALID_CREDENTIALS');
    expect((await json(me)).error.code).toBe('UNAUTHENTICATED');
  });

  it('RN-26 · CA7 · un ADMIN que intenta desactivarse → 422 CANNOT_DEACTIVATE_SELF y sigue activo', async () => {
    const res = await send('PATCH', `/users/${ADMIN_ID}`, admin, { isActive: false });
    const body = await json(res);

    expect(res.status).toBe(422);
    expect(body.error.code).toBe('CANNOT_DEACTIVATE_SELF');
    expect(users.users.find((u) => u.id === ADMIN_ID)?.isActive).toBe(true);
    expect((await send('GET', '/auth/me', admin)).status).toBe(200);
  });

  it('RN-26 · CA7 · el ADMIN sí puede editar su propio nombre y desactivar a otro ADMIN', async () => {
    const otherAdmin = await created({ role: 'ADMIN' });
    const self = await send('PATCH', `/users/${ADMIN_ID}`, admin, { name: 'Administrador RRHH', isActive: true });
    const other = await send('PATCH', `/users/${otherAdmin.id}`, admin, { isActive: false });

    expect([self.status, other.status]).toEqual([200, 200]);
  });

  it('RN-18 · CA8 · reset-password → 204; el usuario entra con la nueva y no con la anterior', async () => {
    const user = await created({ password: 'Prueba12345' });
    const res = await send('POST', `/users/${user.id}/reset-password`, admin, { newPassword: 'Nueva12345' });

    expect(res.status).toBe(204);
    expect((await login(user.email, 'Nueva12345')).status).toBe(200);
    expect((await login(user.email, 'Prueba12345')).status).toBe(401);
  });

  it('RN-18 · CA8 · reset-password con menos de 8 caracteres, sin newPassword o con campos extra → 400', async () => {
    const responses = await Promise.all(
      [{ newPassword: 'Corta12' }, {}, { newPassword: 'Nueva12345', role: 'ADMIN' }].map((b) =>
        send('POST', `/users/${EMP1_ID}/reset-password`, admin, b),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual([400, 400, 400]);
    expect((await login('empleado1@salalibre.local')).status).toBe(200);
  });

  it('CA9 · PATCH o reset-password a un id inexistente → 404 NOT_FOUND; a un id que no es UUID → 400', async () => {
    const responses = await Promise.all([
      send('PATCH', `/users/${MISSING}`, admin, { name: 'X' }),
      send('PATCH', `/users/${MISSING}`, admin, { isActive: false }),
      send('POST', `/users/${MISSING}/reset-password`, admin, { newPassword: 'Nueva12345' }),
      send('PATCH', '/users/no-es-uuid', admin, { name: 'X' }),
      send('POST', '/users/no-es-uuid/reset-password', admin, { newPassword: 'Nueva12345' }),
    ]);
    const bodies = await Promise.all(responses.map((r) => json(r)));

    expect(responses.map((r) => r.status)).toEqual([404, 404, 404, 400, 400]);
    expect(bodies.slice(0, 3).map((b) => b.error.code)).toEqual(['NOT_FOUND', 'NOT_FOUND', 'NOT_FOUND']);
  });

  it('D-16 · CA10 · reactivar → 200 y las reservas canceladas al desactivar no se restauran', async () => {
    const user = await created();
    const future = booking(user.id, '2026-11-24T16:00:00Z', '2026-11-24T17:00:00Z');
    await send('PATCH', `/users/${user.id}`, admin, { isActive: false });

    const res = await send('PATCH', `/users/${user.id}`, admin, { isActive: true });

    expect(res.status).toBe(200);
    expect((await json<UserBody>(res)).isActive).toBe(true);
    expect(stored(future.id).status).toBe('CANCELLED');
  });
});

describe('Desactivación en una sola transacción (T05a, CA5)', () => {
  const ACTOR = ADMIN_ID;
  const TARGET = EMP1_ID;

  function setup(options: { failOnCancel?: boolean; missing?: boolean } = {}) {
    const events: string[] = [];
    const ctx: TransactionContext = {
      advisoryLock: async (key) => {
        events.push(`lock ${key}`);
      },
    };
    const tx: TransactionRunner = {
      run: async (work) => {
        events.push('begin');
        try {
          const result = await work(ctx as never);
          events.push('commit');
          return result;
        } catch (error) {
          events.push('rollback');
          throw error;
        }
      },
    };
    const target: UserWithCredentials = {
      id: TARGET,
      email: 'empleado1@salalibre.local',
      name: 'Empleado Uno',
      role: 'EMPLOYEE',
      isActive: true,
      passwordHash: 'hash',
    };
    const users = {
      findById: async (id: string, c?: TransactionContext) => {
        events.push(`findById${c === ctx ? '' : ' (sin ctx)'}`);
        return options.missing ? null : { ...target, id };
      },
      update: async (c: TransactionContext) => {
        events.push(`update${c === ctx ? '' : ' (sin ctx)'}`);
        return { ...target, isActive: false };
      },
    } as unknown as UsersService;
    const bookings = {
      cancelFutureByUser: async (c: TransactionContext, userId: string, by: string) => {
        events.push(`cancelFutureByUser ${userId} por ${by}${c === ctx ? '' : ' (sin ctx)'}`);
        if (options.failOnCancel) {
          throw new Error('falla simulada');
        }
        return ['b1', 'b2'];
      },
    } as unknown as BookingsService;
    const logger = { setContext: () => undefined, info: () => undefined };
    const service = new UsersAdminService(users, bookings, logger as never, tx);
    return { service, events };
  }

  it('RN-15 · spec §11 · begin → lock user:<uuid> → lectura con ctx → UPDATE → cancelación con ctx → commit', async () => {
    const { service, events } = setup();

    await service.update(ACTOR, TARGET, { isActive: false });

    expect(events).toEqual([
      'begin',
      `lock user:${TARGET}`,
      'findById',
      'update',
      `cancelFutureByUser ${TARGET} por ${ACTOR}`,
      'commit',
    ]);
  });

  it('RN-15 · si la cancelación en cascada falla, el error sale de la transacción (rollback) y no se responde 200', async () => {
    const { service, events } = setup({ failOnCancel: true });

    await expect(service.update(ACTOR, TARGET, { isActive: false })).rejects.toThrow('falla simulada');
    expect(events.at(-1)).toBe('rollback');
    expect(events).not.toContain('commit');
  });

  it('D-32 · id inexistente → 404 antes que CANNOT_DEACTIVATE_SELF; sin isActive: false no se cancela nada', async () => {
    const missing = setup({ missing: true });
    await expect(missing.service.update(ACTOR, ACTOR, { isActive: false })).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const rename = setup();
    await rename.service.update(ACTOR, TARGET, { name: 'Otro', isActive: true });
    expect(rename.events.some((e) => e.startsWith('cancelFutureByUser'))).toBe(false);
  });
});

describe('Capas del módulo de usuarios (T05a)', () => {
  const dir = join(__dirname, '..', 'src', 'modules', 'users');
  const files = (path: string): string[] =>
    readdirSync(path, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(path, e.name)) : e.name.endsWith('.ts') ? [join(path, e.name)] : [],
    );
  const imports = (file: string) => [...readFileSync(file, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]);

  it('CLAUDE.md · de otros módulos solo se usa el service y el controller no importa Prisma ni repositorios', () => {
    const foreign = files(dir)
      .flatMap(imports)
      .filter((i) => i.startsWith('../') && /modules|\.\.\/(auth|bookings|rooms|closures|audit)\//.test(i));
    const controller = imports(join(dir, 'users.controller.ts'));

    expect(foreign.filter((i) => !/\/[a-z-]+\.(service|module)$/.test(i))).toEqual([]);
    expect(controller.filter((i) => /prisma|repository/i.test(i))).toEqual([]);
  });

  it('CLAUDE.md · el dominio de usuarios no importa @nestjs, @prisma ni Prisma', () => {
    const domain = files(join(dir, 'domain')).flatMap(imports);

    expect(domain.filter((i) => /@nestjs|@prisma|prisma/i.test(i))).toEqual([]);
  });

  it('A02 · el repositorio Prisma no devuelve passwordHash fuera de findByEmail y findById', () => {
    const repo = readFileSync(join(dir, 'infrastructure', 'prisma-users.repository.ts'), 'utf8');
    const publicSelect = /const PUBLIC = \{([^}]*)\}/.exec(repo)?.[1] ?? '';

    expect(publicSelect).not.toContain('passwordHash');
    expect(repo.match(/select: SELECT/g)).toHaveLength(2);
  });
});
