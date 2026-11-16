import type { INestApplication } from '@nestjs/common';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadBusinessConfig } from '../src/common/config/business-config';
import { CLOCK } from '../src/common/time/clock';
import type { TransactionContext, TransactionRunner } from '../src/common/transaction/transaction-runner';
import type { BookingsService } from '../src/modules/bookings/bookings.service';
import type { BookingRecord } from '../src/modules/bookings/domain/booking';
import { BOOKINGS_REPOSITORY } from '../src/modules/bookings/domain/bookings.repository';
import { ClosuresModule } from '../src/modules/closures/closures.module';
import { ClosuresService } from '../src/modules/closures/closures.service';
import { CLOSURES_REPOSITORY, type ClosuresRepository } from '../src/modules/closures/domain/closures.repository';
import { ROOMS_REPOSITORY } from '../src/modules/rooms/domain/rooms.repository';
import { createApp, json, sessionCookie } from './support/auth-app';
import { InMemoryBookingsRepository } from './support/in-memory-bookings.repository';
import { InMemoryClosuresRepository } from './support/in-memory-closures.repository';
import { InMemoryRoomsRepository } from './support/in-memory-rooms.repository';
import { InMemoryUsersRepository, TEST_PASSWORD, testUsers } from './support/in-memory-users.repository';

interface ClosureBody {
  id: string;
  date: string;
  reason: string;
  cancelledBookings?: number;
}

// Reloj fijo: lunes 2026-11-16 10:00 en Tegucigalpa (16:00Z, UTC-6). "Hoy" = 2026-11-16.
const NOW = new Date('2026-11-16T16:00:00Z');
const TODAY = '2026-11-16';
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const EMP1_ID = '22222222-2222-4222-8222-222222222222';
const COPAN = 'a1111111-1111-4111-8111-111111111111';
const ROATAN = 'a2222222-2222-4222-8222-222222222222';
const MISSING = 'b9999999-9999-4999-8999-999999999999';

describe('Módulo de cierres (T05b)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let bookings: InMemoryBookingsRepository;
  let closures: InMemoryClosuresRepository;
  let admin: string;
  let employee: string;
  let seq = 0;

  const login = async (email: string) =>
    sessionCookie(
      await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: TEST_PASSWORD }),
      }),
    );

  const send = (method: 'GET' | 'POST' | 'DELETE', path: string, cookie?: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const booking = (startAt: string, endAt: string, roomId = COPAN, userId = EMP1_ID): BookingRecord => {
    const record: BookingRecord = {
      id: `b-${++seq}`,
      roomId,
      roomName: roomId === COPAN ? 'Sala Copán' : 'Sala Roatán',
      userId,
      ownerName: 'Empleado Uno',
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

  /** Cierre insertado directo en el repositorio (para fechas de hoy o pasadas, que la API no deja crear). */
  const seedClosure = (date: string) => {
    const c = { id: `c${String(++seq).padStart(7, '0')}-1111-4111-8111-111111111111`, date, reason: 'Sembrado', createdById: ADMIN_ID };
    closures.closures.push(c);
    return c;
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '8h';
    process.env.NODE_ENV = 'test';
    const users = new InMemoryUsersRepository(testUsers());
    const rooms = new InMemoryRoomsRepository();
    bookings = new InMemoryBookingsRepository(
      (id) => rooms.rooms.find((r) => r.id === id)?.name ?? '?',
      (id) => users.users.find((u) => u.id === id)?.name ?? '?',
    );
    closures = new InMemoryClosuresRepository(bookings.closedDates); // comparten la "tabla" closures (RN-10)
    ({ app, baseUrl } = await createApp(users, {
      modules: [ClosuresModule],
      overrides: [
        { token: ROOMS_REPOSITORY, value: rooms },
        { token: BOOKINGS_REPOSITORY, value: bookings },
        { token: CLOSURES_REPOSITORY, value: closures },
        { token: CLOCK, value: { now: () => NOW } },
      ],
    }));
    admin = await login('admin@salalibre.local');
    employee = await login('empleado1@salalibre.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('RN-21 · sin sesión → 401 en GET, POST y DELETE /closures', async () => {
    const responses = await Promise.all([
      send('GET', '/closures'),
      send('POST', '/closures', undefined, { date: '2026-12-01', reason: 'x' }),
      send('DELETE', `/closures/${MISSING}`),
    ]);

    expect(responses.map((r) => r.status)).toEqual([401, 401, 401]);
  });

  it('RN-21 · CA6 · EMPLOYEE en POST o DELETE /closures → 403 FORBIDDEN, aunque el body sea inválido', async () => {
    const before = closures.closures.length;
    const responses = await Promise.all([
      send('POST', '/closures', employee, { date: '2026-12-02', reason: 'x' }),
      send('POST', '/closures', employee, { date: 'mal' }),
      send('DELETE', `/closures/${MISSING}`, employee),
    ]);
    const bodies = await Promise.all(responses.map((r) => json(r)));

    expect(responses.map((r) => r.status)).toEqual([403, 403, 403]);
    expect(bodies.map((b) => b.error.code)).toEqual(['FORBIDDEN', 'FORBIDDEN', 'FORBIDDEN']);
    expect(closures.closures.length).toBe(before);
  });

  it('RN-16 · CA2 · ADMIN cierra un día futuro → 201 con cancelledBookings = k y solo las CONFIRMED de ese día local se cancelan', async () => {
    // 2026-11-18 local: 10:00–11:00 (16:00Z) en Copán, 13:00–14:00 en Roatán y 19:00–20:00 (01:00Z del día 19, mismo día local).
    const a = booking('2026-11-18T16:00:00Z', '2026-11-18T17:00:00Z');
    const b = booking('2026-11-18T19:00:00Z', '2026-11-18T20:00:00Z', ROATAN, ADMIN_ID);
    const late = booking('2026-11-19T01:00:00Z', '2026-11-19T02:00:00Z');
    const cancelledBefore = booking('2026-11-18T18:00:00Z', '2026-11-18T19:00:00Z');
    Object.assign(cancelledBefore, { status: 'CANCELLED', cancelledAt: NOW, cancelledById: EMP1_ID });
    // Otros días locales: 2026-11-17 19:45 local (01:45Z del 18) y 2026-11-19 07:00 local (13:00Z).
    const dayBefore = booking('2026-11-18T01:45:00Z', '2026-11-18T02:00:00Z');
    const dayAfter = booking('2026-11-19T13:00:00Z', '2026-11-19T14:00:00Z');

    const res = await send('POST', '/closures', admin, { date: '2026-11-18', reason: 'Mantenimiento' });
    const body = await json<ClosureBody>(res);

    expect(res.status).toBe(201);
    expect(body).toEqual({ id: expect.any(String), date: '2026-11-18', reason: 'Mantenimiento', cancelledBookings: 3 });
    for (const x of [a, b, late]) {
      expect(stored(x.id)).toMatchObject({ status: 'CANCELLED', cancelledById: ADMIN_ID, cancelledAt: NOW });
    }
    expect(stored(cancelledBefore.id).cancelledById).toBe(EMP1_ID);
    expect(stored(dayBefore.id).status).toBe('CONFIRMED');
    expect(stored(dayAfter.id).status).toBe('CONFIRMED');
  });

  it('RN-16 · CA2 · un día sin reservas → 201 con cancelledBookings: 0', async () => {
    const res = await send('POST', '/closures', admin, { date: '2026-12-24', reason: 'Nochebuena' });

    expect(res.status).toBe(201);
    expect((await json<ClosureBody>(res)).cancelledBookings).toBe(0);
  });

  it('RN-24 · CA3 · fecha de hoy o pasada → 422 CLOSURE_IN_PAST y no se crea ni se cancela nada', async () => {
    const todays = booking('2026-11-16T20:00:00Z', '2026-11-16T21:00:00Z');
    const before = closures.closures.length;
    const responses = await Promise.all(
      [TODAY, '2026-11-15', '2025-01-01'].map((date) => send('POST', '/closures', admin, { date, reason: 'x' })),
    );
    const bodies = await Promise.all(responses.map((r) => json(r)));

    expect(responses.map((r) => r.status)).toEqual([422, 422, 422]);
    expect(bodies.map((b) => b.error.code)).toEqual(['CLOSURE_IN_PAST', 'CLOSURE_IN_PAST', 'CLOSURE_IN_PAST']);
    expect(closures.closures.length).toBe(before);
    expect(stored(todays.id).status).toBe('CONFIRMED');
  });

  it('RN-24 · CA3 · fecha ya cerrada → 409 CLOSURE_EXISTS; una fecha pasada repetida da 422 antes que 409 (D-32)', async () => {
    seedClosure('2026-11-10');
    await send('POST', '/closures', admin, { date: '2026-12-31', reason: 'Fin de año' });

    const repeated = await send('POST', '/closures', admin, { date: '2026-12-31', reason: 'Otra vez' });
    const pastRepeated = await send('POST', '/closures', admin, { date: '2026-11-10', reason: 'Otra vez' });

    expect(repeated.status).toBe(409);
    expect((await json(repeated)).error.code).toBe('CLOSURE_EXISTS');
    expect(pastRepeated.status).toBe(422);
    expect((await json(pastRepeated)).error.code).toBe('CLOSURE_IN_PAST');
  });

  it('CA3 · reason vacío, en blanco o > 100, fecha mal formada o inexistente, o campos extra → 400 VALIDATION_ERROR', async () => {
    const before = closures.closures.length;
    const invalid: Record<string, unknown>[] = [
      { date: '2026-12-10', reason: '' },
      { date: '2026-12-10', reason: '   ' },
      { date: '2026-12-10', reason: 'x'.repeat(101) },
      { date: '2026-12-10' },
      { date: '10/12/2026', reason: 'x' },
      { date: '2026-12-10T00:00:00Z', reason: 'x' },
      { date: '2026-02-30', reason: 'x' },
      { date: null, reason: 'x' },
      { reason: 'x' },
      { date: '2026-12-10', reason: 'x', roomId: COPAN },
    ];
    const responses = await Promise.all(invalid.map((b) => send('POST', '/closures', admin, b)));
    const bodies = await Promise.all(responses.map((r) => json(r)));

    expect(responses.map((r) => r.status)).toEqual(invalid.map(() => 400));
    expect(new Set(bodies.map((b) => b.error.code))).toEqual(new Set(['VALIDATION_ERROR']));
    expect(closures.closures.length).toBe(before);
  });

  it('RN-10 · CA4 · reservar en un día cerrado → 422 DAY_CLOSED', async () => {
    await send('POST', '/closures', admin, { date: '2026-11-20', reason: 'Inventario' });

    const res = await send('POST', '/bookings', employee, {
      roomId: COPAN,
      startAt: '2026-11-20T16:00:00Z',
      endAt: '2026-11-20T17:00:00Z',
      title: 'No entra',
      attendees: 1,
    });

    expect(res.status).toBe(422);
    expect((await json(res)).error.code).toBe('DAY_CLOSED');
  });

  it('CA1 · GET /closures (cualquier usuario autenticado) → 200 con los cierres de fecha ≥ hoy ordenados por fecha', async () => {
    seedClosure(TODAY);
    seedClosure('2026-11-01');
    const asEmployee = await send('GET', '/closures', employee);
    const asAdmin = await send('GET', '/closures', admin);
    const list = await json<ClosureBody[]>(asEmployee);
    const dates = list.map((c) => c.date);

    expect([asEmployee.status, asAdmin.status]).toEqual([200, 200]);
    expect(dates[0]).toBe(TODAY);
    expect(dates.every((d) => d >= TODAY)).toBe(true);
    expect(dates).toEqual([...dates].sort());
    expect(dates).toEqual(expect.arrayContaining(['2026-11-18', '2026-11-20', '2026-12-24', '2026-12-31']));
    expect(Object.keys(list[0]).sort()).toEqual(['date', 'id', 'reason']);
  });

  it('S-05 · CA5 · DELETE de un cierre futuro → 204, se puede volver a reservar y las canceladas no se restauran', async () => {
    const victim = booking('2026-11-25T16:00:00Z', '2026-11-25T17:00:00Z');
    const created = await json<ClosureBody>(await send('POST', '/closures', admin, { date: '2026-11-25', reason: 'Error' }));
    expect(stored(victim.id).status).toBe('CANCELLED');

    const res = await send('DELETE', `/closures/${created.id}`, admin);
    const list = await json<ClosureBody[]>(await send('GET', '/closures', admin));
    const rebook = await send('POST', '/bookings', employee, {
      roomId: ROATAN,
      startAt: '2026-11-25T16:00:00Z',
      endAt: '2026-11-25T17:00:00Z',
      title: 'Ya se puede',
      attendees: 1,
    });

    expect(res.status).toBe(204);
    expect(list.some((c) => c.id === created.id)).toBe(false);
    expect(stored(victim.id).status).toBe('CANCELLED');
    expect(rebook.status).toBe(201);
  });

  it('RN-24 · D-31 · CA5 · DELETE de un cierre de hoy o pasado → 422 CLOSURE_IN_PAST y el cierre sigue', async () => {
    const today = closures.closures.find((c) => c.date === TODAY) ?? seedClosure(TODAY);
    const past = seedClosure('2026-10-12');
    const responses = await Promise.all([today, past].map((c) => send('DELETE', `/closures/${c.id}`, admin)));
    const bodies = await Promise.all(responses.map((r) => json(r)));

    expect(responses.map((r) => r.status)).toEqual([422, 422]);
    expect(bodies.map((b) => b.error.code)).toEqual(['CLOSURE_IN_PAST', 'CLOSURE_IN_PAST']);
    expect(closures.closures.some((c) => c.id === past.id)).toBe(true);
  });

  it('CA7 · DELETE de un id inexistente → 404 NOT_FOUND; de un id que no es UUID → 400', async () => {
    const missing = await send('DELETE', `/closures/${MISSING}`, admin);
    const malformed = await send('DELETE', '/closures/no-es-uuid', admin);

    expect(missing.status).toBe(404);
    expect((await json(missing)).error.code).toBe('NOT_FOUND');
    expect(malformed.status).toBe(400);
  });
});

describe('Cierre en una sola transacción (T05b, CA2)', () => {
  const DATE = '2026-11-18';

  function setup(options: { failOnCancel?: boolean; exists?: boolean } = {}) {
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
    const repo = {
      create: async (c: TransactionContext) => {
        events.push(`create${c === ctx ? '' : ' (sin ctx)'}`);
        if (options.exists) {
          throw Object.assign(new Error('existe'), { code: 'CLOSURE_EXISTS' });
        }
        return { id: 'c1', date: DATE, reason: 'x' };
      },
    } as unknown as ClosuresRepository;
    const bookings = {
      cancelConfirmedByDate: async (c: TransactionContext, date: string, by: string) => {
        events.push(`cancelConfirmedByDate ${date} por ${by}${c === ctx ? '' : ' (sin ctx)'}`);
        if (options.failOnCancel) {
          throw new Error('falla simulada');
        }
        return ['b1', 'b2'];
      },
    } as unknown as BookingsService;
    const logger = { setContext: () => undefined, info: () => undefined };
    const config = loadBusinessConfig({});
    const service = new ClosuresService(repo, tx, config, { now: () => NOW }, bookings, logger as never);
    return { service, events };
  }

  it('RN-16 · spec §11 · begin → lock date:<AAAA-MM-DD> → INSERT con ctx → cancelación con ctx → commit', async () => {
    const { service, events } = setup();

    const result = await service.create(ADMIN_ID, DATE, 'x');

    expect(result.cancelledBookings).toBe(2);
    expect(events).toEqual([
      'begin',
      `lock date:${DATE}`,
      'create',
      `cancelConfirmedByDate ${DATE} por ${ADMIN_ID}`,
      'commit',
    ]);
  });

  it('RN-16 · si la cancelación en cascada falla, el error sale de la transacción (rollback) y no se responde 201', async () => {
    const { service, events } = setup({ failOnCancel: true });

    await expect(service.create(ADMIN_ID, DATE, 'x')).rejects.toThrow('falla simulada');
    expect(events.at(-1)).toBe('rollback');
  });

  it('RN-24 · D-32 · fecha de hoy → 422 sin abrir transacción; fecha repetida → 409 sin cancelar reservas', async () => {
    const today = setup();
    await expect(today.service.create(ADMIN_ID, TODAY, 'x')).rejects.toMatchObject({ code: 'CLOSURE_IN_PAST' });
    expect(today.events).toEqual([]);

    const repeated = setup({ exists: true });
    await expect(repeated.service.create(ADMIN_ID, DATE, 'x')).rejects.toMatchObject({ code: 'CLOSURE_EXISTS' });
    expect(repeated.events.some((e) => e.startsWith('cancelConfirmedByDate'))).toBe(false);
  });
});

describe('Capas del módulo de cierres (T05b)', () => {
  const dir = join(__dirname, '..', 'src', 'modules', 'closures');
  const files = (path: string): string[] =>
    readdirSync(path, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(path, e.name)) : e.name.endsWith('.ts') ? [join(path, e.name)] : [],
    );
  const imports = (file: string) => [...readFileSync(file, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]);

  it('CLAUDE.md · de otros módulos solo se usa el service y el controller no importa Prisma ni repositorios', () => {
    const foreign = files(dir)
      .flatMap(imports)
      .filter((i) => /^\.\.\/(auth|bookings|rooms|users|audit)\//.test(i));
    const controller = imports(join(dir, 'closures.controller.ts'));

    expect(foreign.filter((i) => !/\/[a-z-]+\.(service|module)$/.test(i))).toEqual([]);
    expect(controller.filter((i) => /prisma|repository/i.test(i))).toEqual([]);
  });

  it('CLAUDE.md · el dominio de cierres no importa @nestjs, @prisma ni Prisma', () => {
    const domain = files(join(dir, 'domain')).flatMap(imports);

    expect(domain.filter((i) => /@nestjs|@prisma|prisma/i.test(i))).toEqual([]);
  });

  it('CLAUDE.md · el módulo de reservas no importa el de cierres (sin ciclo de módulos)', () => {
    const bookingsDir = join(__dirname, '..', 'src', 'modules', 'bookings');

    expect(files(bookingsDir).flatMap(imports).filter((i) => /closures/.test(i))).toEqual([]);
  });
});
