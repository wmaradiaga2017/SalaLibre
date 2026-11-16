import type { INestApplication } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLOCK } from '../src/common/time/clock';
import { BookingsModule } from '../src/modules/bookings/bookings.module';
import { BOOKINGS_REPOSITORY } from '../src/modules/bookings/domain/bookings.repository';
import { ROOMS_REPOSITORY } from '../src/modules/rooms/domain/rooms.repository';
import { createApp, json, sessionCookie } from './support/auth-app';
import { InMemoryBookingsRepository } from './support/in-memory-bookings.repository';
import { InMemoryRoomsRepository } from './support/in-memory-rooms.repository';
import { InMemoryUsersRepository, TEST_PASSWORD, testUsers } from './support/in-memory-users.repository';

interface BookingBody {
  id: string;
  roomId: string;
  roomName: string;
  owner: { id: string; name: string };
  title: string | null;
  attendees: number;
  startAt: string;
  endAt: string;
  status: 'CONFIRMED' | 'CANCELLED';
  cancelledAt: string | null;
  cancelledBy: { id: string; name: string } | null;
  isMine: boolean;
}

// Reloj fijo: lunes 2026-11-16 10:00 en Tegucigalpa (16:00Z). "Mañana" (martes 17) 10:00–11:00 local = 16:00Z–17:00Z.
const NOW = new Date('2026-11-16T16:00:00Z');
const COPAN = 'a1111111-1111-4111-8111-111111111111'; // capacidad 8, activa
const ROATAN = 'a2222222-2222-4222-8222-222222222222'; // capacidad 4, activa
const ANTIGUA = 'a3333333-3333-4333-8333-333333333333'; // inactiva
const EMP2_ID = '44444444-4444-4444-8444-444444444444';

const at = (localDateTime: string) => new Date(`${localDateTime}:00-06:00`).toISOString();

describe('Módulo de reservas (T05)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let bookings: InMemoryBookingsRepository;
  let emp1: string;
  let emp2: string;
  let admin: string;

  const login = async (email: string) =>
    sessionCookie(
      await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: TEST_PASSWORD }),
      }),
    );

  const create = (cookie: string, body: Record<string, unknown>) =>
    fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });

  const booking = (start: string, end: string, extra: Record<string, unknown> = {}) => ({
    roomId: COPAN,
    startAt: at(start),
    endAt: at(end),
    title: 'Demo',
    attendees: 2,
    ...extra,
  });

  const cancel = (cookie: string, id: string) =>
    fetch(`${baseUrl}/bookings/${id}/cancel`, { method: 'POST', headers: { Cookie: cookie } });

  const get = (cookie: string, path: string) => fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie } });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '8h';
    process.env.NODE_ENV = 'test';
    const users = new InMemoryUsersRepository([
      ...testUsers(),
      {
        id: EMP2_ID,
        email: 'empleado2@salalibre.local',
        name: 'Empleado Dos',
        role: 'EMPLOYEE',
        isActive: true,
        passwordHash: hashSync(TEST_PASSWORD, 4),
      },
    ]);
    const rooms = new InMemoryRoomsRepository();
    bookings = new InMemoryBookingsRepository(
      (id) => rooms.rooms.find((r) => r.id === id)?.name ?? '?',
      (id) => users.users.find((u) => u.id === id)?.name ?? '?',
    );
    ({ app, baseUrl } = await createApp(users, {
      modules: [BookingsModule],
      overrides: [
        { token: ROOMS_REPOSITORY, value: rooms },
        { token: BOOKINGS_REPOSITORY, value: bookings },
        { token: CLOCK, value: { now: () => NOW } },
      ],
    }));
    emp1 = await login('empleado1@salalibre.local');
    emp2 = await login('empleado2@salalibre.local');
    admin = await login('admin@salalibre.local');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    bookings.bookings.length = 0;
    bookings.closedDates.clear();
  });

  it('RN-01 · reserva válida → 201 con la Booking (CONFIRMED, isMine: true)', async () => {
    const res = await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00', { title: '  Planificación  ' }));
    const body = await json<BookingBody>(res);

    expect(res.status).toBe(201);
    expect(body).toEqual({
      id: expect.any(String),
      roomId: COPAN,
      roomName: 'Sala Copán',
      owner: { id: '22222222-2222-4222-8222-222222222222', name: 'Empleado Uno' },
      title: 'Planificación', // RN-08: se guarda recortado
      attendees: 2,
      startAt: '2026-11-17T16:00:00.000Z',
      endAt: '2026-11-17T17:00:00.000Z',
      status: 'CONFIRMED',
      cancelledAt: null,
      cancelledBy: null,
      isMine: true,
    });
  });

  it('RN-01 · solapamiento en la misma sala → 409 BOOKING_CONFLICT con requestId; contigua o en otra sala → 201', async () => {
    await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00'));

    const overlap = await create(emp2, booking('2026-11-17T10:30', '2026-11-17T11:30'));
    const body = await json(overlap);
    const contiguous = await create(emp2, booking('2026-11-17T11:00', '2026-11-17T12:00'));
    const otherRoom = await create(emp2, booking('2026-11-17T10:30', '2026-11-17T11:30', { roomId: ROATAN }));

    expect(overlap.status).toBe(409);
    expect(body.error).toEqual({
      code: 'BOOKING_CONFLICT',
      message: 'La sala ya está reservada en ese horario.',
      requestId: overlap.headers.get('x-request-id'),
    });
    expect(contiguous.status).toBe(201);
    expect(otherRoom.status).toBe(201);
  });

  it('RN-01 · una reserva cancelada no bloquea el hueco → 201', async () => {
    const first = await json<BookingBody>(await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00')));
    await cancel(emp1, first.id);

    expect((await create(emp2, booking('2026-11-17T10:00', '2026-11-17T11:00'))).status).toBe(201);
  });

  it('RN-01 · solicitudes simultáneas por el mismo hueco → una 201 y el resto 409, nunca 500', async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => create(emp2, booking('2026-11-18T09:00', '2026-11-18T10:00'))),
    );
    const statuses = responses.map((r) => r.status).sort();

    expect(statuses).toEqual([201, 409, 409, 409, 409]);
  });

  it('RN-02 · RN-03 · RN-04 · RN-05 · RN-06 · errores de tiempo por HTTP → 422 con su código', async () => {
    const cases: [Record<string, unknown>, string][] = [
      [booking('2026-11-17T10:10', '2026-11-17T11:00'), 'INVALID_SLOT'],
      [booking('2026-11-17T10:00', '2026-11-17T14:15'), 'INVALID_DURATION'],
      [booking('2026-11-21T10:00', '2026-11-21T11:00'), 'OUTSIDE_BUSINESS_HOURS'],
      [booking('2026-11-16T09:00', '2026-11-16T09:30'), 'BOOKING_IN_PAST'],
      [booking('2026-12-16T10:15', '2026-12-16T11:00'), 'TOO_FAR_AHEAD'],
      [booking('2026-11-21T10:10', '2026-11-21T11:00', { roomId: ANTIGUA }), 'INVALID_SLOT'], // D-32: el primero
    ];
    for (const [body, code] of cases) {
      const res = await create(emp1, body);
      expect([res.status, (await json(res)).error.code]).toEqual([422, code]);
    }
    expect((await create(emp1, booking('2026-12-16T10:00', '2026-12-16T11:00'))).status).toBe(201); // justo 30 días
  });

  it('RN-07 · RN-09 · RN-10 · capacidad superada, sala inactiva y día cerrado → 422; sala inexistente → 404', async () => {
    bookings.closedDates.add('2026-11-19');
    const capacity = await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00', { roomId: ROATAN, attendees: 5 }));
    const inactive = await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00', { roomId: ANTIGUA }));
    const closed = await create(emp1, booking('2026-11-19T10:00', '2026-11-19T11:00'));
    const missing = await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00', { roomId: 'b9999999-9999-4999-8999-999999999999' }));

    expect([capacity.status, (await json(capacity)).error.code]).toEqual([422, 'CAPACITY_EXCEEDED']);
    expect([inactive.status, (await json(inactive)).error.code]).toEqual([422, 'ROOM_INACTIVE']);
    expect([closed.status, (await json(closed)).error.code]).toEqual([422, 'DAY_CLOSED']);
    expect([missing.status, (await json(missing)).error.code]).toEqual([404, 'NOT_FOUND']);
    expect(bookings.bookings).toHaveLength(0);
  });

  it('RN-07 · RN-08 · asistentes no enteros o < 1, título vacío, de solo espacios o > 100 tras recortar, fechas sin zona → 400', async () => {
    const invalid = [
      booking('2026-11-17T10:00', '2026-11-17T11:00', { attendees: 0 }),
      booking('2026-11-17T10:00', '2026-11-17T11:00', { attendees: 2.5 }),
      booking('2026-11-17T10:00', '2026-11-17T11:00', { attendees: '2' }),
      booking('2026-11-17T10:00', '2026-11-17T11:00', { title: '' }),
      booking('2026-11-17T10:00', '2026-11-17T11:00', { title: '    ' }),
      booking('2026-11-17T10:00', '2026-11-17T11:00', { title: 'x'.repeat(101) }),
      booking('2026-11-17T10:00', '2026-11-17T11:00', { startAt: '2026-11-17T10:00:00' }),
      booking('2026-11-17T10:00', '2026-11-17T11:00', { endAt: 'mañana' }),
      booking('2026-11-17T10:00', '2026-11-17T11:00', { roomId: 'no-es-uuid' }),
      booking('2026-11-17T10:00', '2026-11-17T11:00', { status: 'CANCELLED' }),
      { roomId: COPAN, startAt: at('2026-11-17T10:00'), endAt: at('2026-11-17T11:00'), attendees: 2 },
    ];
    const responses = await Promise.all(invalid.map((b) => create(emp1, b)));
    const codes = await Promise.all(responses.map(async (r) => (await json(r)).error.code));

    expect(responses.map((r) => r.status)).toEqual(invalid.map(() => 400));
    expect(new Set(codes)).toEqual(new Set(['VALIDATION_ERROR']));
    // 100 caracteres con espacios alrededor: válido tras recortar
    const edge = await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00', { title: `  ${'x'.repeat(100)}  ` }));
    expect(edge.status).toBe(201);
  });

  it('RN-11 · RN-12 · RN-13 · cancelar: dueño → 200 con cancelledAt y cancelledBy; otro EMPLOYEE → 403; ADMIN → 200; repetida → 422; inexistente → 404', async () => {
    const mine = await json<BookingBody>(await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00')));
    const other = await json<BookingBody>(await create(emp1, booking('2026-11-17T12:00', '2026-11-17T13:00')));

    const forbidden = await cancel(emp2, mine.id);
    const byOwner = await cancel(emp1, mine.id);
    const ownerBody = await json<BookingBody>(byOwner);
    const again = await cancel(emp1, mine.id);
    const byAdmin = await cancel(admin, other.id);
    const adminBody = await json<BookingBody>(byAdmin);
    const missing = await cancel(emp1, 'b9999999-9999-4999-8999-999999999999');
    const notUuid = await cancel(emp1, 'no-es-uuid');

    expect([forbidden.status, (await json(forbidden)).error.code]).toEqual([403, 'FORBIDDEN']);
    expect(byOwner.status).toBe(200);
    expect(ownerBody).toMatchObject({
      status: 'CANCELLED',
      cancelledAt: NOW.toISOString(),
      cancelledBy: { id: '22222222-2222-4222-8222-222222222222', name: 'Empleado Uno' },
    });
    expect([again.status, (await json(again)).error.code]).toEqual([422, 'BOOKING_ALREADY_CANCELLED']);
    expect(byAdmin.status).toBe(200);
    expect(adminBody).toMatchObject({
      status: 'CANCELLED',
      title: 'Demo',
      isMine: false,
      cancelledBy: { id: '11111111-1111-4111-8111-111111111111', name: 'Administrador RRHH' },
    });
    expect([missing.status, (await json(missing)).error.code]).toEqual([404, 'NOT_FOUND']);
    expect(notUuid.status).toBe(400);
  });

  it('RN-12 · cancelar una reserva que ya empezó → 422 BOOKING_ALREADY_STARTED', async () => {
    bookings.bookings.push({
      id: 'c1111111-1111-4111-8111-111111111111',
      roomId: COPAN,
      roomName: 'Sala Copán',
      userId: '22222222-2222-4222-8222-222222222222',
      ownerName: 'Empleado Uno',
      title: 'En curso',
      attendees: 2,
      startAt: new Date('2026-11-16T15:30:00Z'), // 09:30 local, antes de "ahora"
      endAt: new Date('2026-11-16T16:30:00Z'),
      status: 'CONFIRMED',
      cancelledAt: null,
      cancelledById: null,
      cancelledByName: null,
    });

    const res = await cancel(emp1, 'c1111111-1111-4111-8111-111111111111');

    expect([res.status, (await json(res)).error.code]).toEqual([422, 'BOOKING_ALREADY_STARTED']);
  });

  it('RN-17 · GET /bookings?date= solo trae las CONFIRMED de ese día local, con title null en ajenas para un EMPLOYEE y con título para el ADMIN', async () => {
    const own = await json<BookingBody>(await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00', { title: 'Mía' })));
    await create(emp2, booking('2026-11-17T07:00', '2026-11-17T08:00', { title: 'Ajena', roomId: ROATAN }));
    await create(emp2, booking('2026-11-17T19:00', '2026-11-17T20:00', { title: 'Tarde' })); // 01:00Z del día 18
    const cancelled = await json<BookingBody>(await create(emp2, booking('2026-11-17T12:00', '2026-11-17T13:00')));
    await cancel(emp2, cancelled.id);
    await create(emp2, booking('2026-11-18T10:00', '2026-11-18T11:00')); // otro día

    const asEmp1 = await json<BookingBody[]>(await get(emp1, '/bookings?date=2026-11-17'));
    const asAdmin = await json<BookingBody[]>(await get(admin, '/bookings?date=2026-11-17'));

    expect(asEmp1.map((b) => [b.title, b.isMine])).toEqual([
      [null, false],
      ['Mía', true],
      [null, false],
    ]);
    expect(asEmp1[1].id).toBe(own.id);
    expect(asAdmin.map((b) => b.title)).toEqual(['Ajena', 'Mía', 'Tarde']);
  });

  it('D-06 · GET /bookings sin date, con formato inválido o fecha inexistente → 400 VALIDATION_ERROR', async () => {
    const responses = await Promise.all(
      ['/bookings', '/bookings?date=17-11-2026', '/bookings?date=2026-02-30', '/bookings?date=2026-11-17&x=1'].map((p) =>
        get(emp1, p),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual([400, 400, 400, 400]);
  });

  it('RN-13 · GET /bookings/mine trae solo las propias con endAt ≥ inicio de hoy, en ambos estados, ordenadas por startAt', async () => {
    bookings.bookings.push({
      id: 'c2222222-2222-4222-8222-222222222222',
      roomId: COPAN,
      roomName: 'Sala Copán',
      userId: '22222222-2222-4222-8222-222222222222',
      ownerName: 'Empleado Uno',
      title: 'Ayer',
      attendees: 1,
      startAt: new Date('2026-11-13T16:00:00Z'), // viernes pasado
      endAt: new Date('2026-11-13T17:00:00Z'),
      status: 'CONFIRMED',
      cancelledAt: null,
      cancelledById: null,
      cancelledByName: null,
    });
    bookings.bookings.push({
      id: 'c3333333-3333-4333-8333-333333333333',
      roomId: COPAN,
      roomName: 'Sala Copán',
      userId: '22222222-2222-4222-8222-222222222222',
      ownerName: 'Empleado Uno',
      title: 'Hoy temprano',
      attendees: 1,
      startAt: new Date('2026-11-16T13:00:00Z'), // hoy 07:00 local, ya terminó
      endAt: new Date('2026-11-16T14:00:00Z'),
      status: 'CONFIRMED',
      cancelledAt: null,
      cancelledById: null,
      cancelledByName: null,
    });
    await create(emp1, booking('2026-11-18T10:00', '2026-11-18T11:00', { title: 'Miércoles' }));
    const tuesday = await json<BookingBody>(await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00', { title: 'Martes' })));
    await cancel(emp1, tuesday.id);
    await create(emp2, booking('2026-11-17T12:00', '2026-11-17T13:00', { title: 'De otro' }));

    const mine = await json<BookingBody[]>(await get(emp1, '/bookings/mine'));

    expect(mine.map((b) => [b.title, b.status])).toEqual([
      ['Hoy temprano', 'CONFIRMED'],
      ['Martes', 'CANCELLED'],
      ['Miércoles', 'CONFIRMED'],
    ]);
  });

  it('RN-20 · con 6 reservas futuras activas se puede crear otra → 201', async () => {
    for (let i = 0; i < 6; i++) {
      expect((await create(emp1, booking(`2026-11-17T${String(8 + i).padStart(2, '0')}:00`, `2026-11-17T${String(9 + i).padStart(2, '0')}:00`))).status).toBe(201);
    }

    expect((await create(emp1, booking('2026-11-18T08:00', '2026-11-18T09:00'))).status).toBe(201);
  });

  it('RN-13 · PATCH, PUT o DELETE sobre /bookings/:id → 404 (no existen)', async () => {
    const b = await json<BookingBody>(await create(emp1, booking('2026-11-17T10:00', '2026-11-17T11:00')));
    const responses = await Promise.all(
      ['PATCH', 'PUT', 'DELETE'].map((method) =>
        fetch(`${baseUrl}/bookings/${b.id}`, {
          method,
          headers: { 'Content-Type': 'application/json', Cookie: emp1 },
          body: method === 'DELETE' ? undefined : JSON.stringify({ title: 'Otro' }),
        }),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual([404, 404, 404]);
    expect(bookings.bookings[0]).toMatchObject({ title: 'Demo', status: 'CONFIRMED' });
  });

  it('RN-21 · sin sesión → 401 en todas las rutas de reservas', async () => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/bookings?date=2026-11-17`),
      fetch(`${baseUrl}/bookings/mine`),
      fetch(`${baseUrl}/bookings`, { method: 'POST' }),
      fetch(`${baseUrl}/bookings/b9999999-9999-4999-8999-999999999999/cancel`, { method: 'POST' }),
    ]);

    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401]);
  });
});

describe('Capas del módulo de reservas (T05, CA14)', () => {
  const dir = join(__dirname, '..', 'src', 'modules', 'bookings');
  const files = (path: string): string[] =>
    readdirSync(path, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(path, e.name)) : e.name.endsWith('.ts') ? [join(path, e.name)] : [],
    );
  const imports = (file: string) => [...readFileSync(file, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]);

  it('CLAUDE.md · el dominio no importa @nestjs ni @prisma ni Prisma; el controller no importa Prisma ni repositorios', () => {
    const domain = files(join(dir, 'domain')).flatMap(imports);
    const controller = imports(join(dir, 'bookings.controller.ts'));

    expect(domain.filter((i) => /@nestjs|@prisma|prisma/i.test(i))).toEqual([]);
    expect(controller.filter((i) => /prisma|repository/i.test(i))).toEqual([]);
  });

  it('CLAUDE.md · reservas solo usa de otros módulos su service (RoomsService, UsersService), nunca archivos internos', () => {
    const foreign = files(dir)
      .flatMap(imports)
      .filter((i) => /modules\/|\.\.\/(rooms|users)\//.test(i));

    expect(foreign.sort()).toEqual([
      '../rooms/rooms.module',
      '../rooms/rooms.service',
      '../users/users.module',
      '../users/users.service',
    ]);
  });
});
