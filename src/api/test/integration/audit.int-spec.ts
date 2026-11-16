import {
  IntegrationApp,
  SEED,
  TEST_PASSWORD,
  at,
  body,
  nextBusinessDay,
  statusCount,
  today,
  unique,
  type BookingBody,
  type RoomBody,
} from './support/int-app';
import { addDays } from '../../src/common/time/zoned-time';

// T06a · P-12 (D-05) y P-15 (RN-25) contra PostgreSQL real: cada escritura deja su fila de auditoría en la misma
// transacción, con el request ID del header; las que fallan no dejan nada; audit_logs no admite UPDATE ni DELETE.

interface AuditPageBody {
  items: { id: string; createdAt: string; actor: { id: string; name: string } | null; action: string; entity: string; entityId: string; requestId: string }[];
  page: number;
  pageSize: number;
  total: number;
}

/** Request ID único para encontrar las filas de una petición. */
const rid = (label: string) => `int-${label}-${unique()}`;

/** Ningún secreto en `data`: contraseñas en claro, hashes bcrypt, cookies ni JWT. */
const SECRETS = new RegExp([TEST_PASSWORD, 'Admin12345', 'Empleado12345', String.raw`\$2[aby]\$`, 'access_token', 'eyJ'].join('|'));

describe('Integración · auditoría (D-05, P-12)', () => {
  let api: IntegrationApp;
  let admin: string;
  let adminId: string;
  let room: RoomBody;

  beforeAll(async () => {
    api = await IntegrationApp.start();
    admin = await api.login(SEED.admin.email, SEED.admin.password);
    adminId = (await api.prisma.user.findUniqueOrThrow({ where: { email: SEED.admin.email } })).id;
    room = await api.createRoom(admin, 10);
  });

  beforeEach(() => api.reset());

  afterAll(async () => {
    await api.reset();
    await api.close();
  });

  const rowsOf = (requestId: string) =>
    api.prisma.auditLog.findMany({ where: { requestId }, orderBy: [{ action: 'asc' }, { entityId: 'asc' }] });

  /** Exactamente una fila con ese request ID, y sin secretos. */
  async function single(requestId: string) {
    const rows = await rowsOf(requestId);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0].data)).not.toMatch(SECRETS);
    return rows[0];
  }

  it('D-05 · P-12 · CA1 · las 10 AuditAction dejan exactamente 1 fila con actor, entidad y el request ID del header', async () => {
    // Salas
    let id = rid('room-created');
    const created = await body<RoomBody>(
      await api.request('POST', '/rooms', {
        cookie: admin,
        requestId: id,
        body: { name: `Sala Audit ${unique()}`, capacity: 6, location: 'Piso 2', equipment: ['TV'] },
      }),
    );
    expect(await single(id)).toMatchObject({ action: 'ROOM_CREATED', actorId: adminId, entity: 'room', entityId: created.id });

    id = rid('room-updated');
    expect((await api.request('PATCH', `/rooms/${created.id}`, { cookie: admin, requestId: id, body: { capacity: 7 } })).status).toBe(200);
    expect(await single(id)).toMatchObject({ action: 'ROOM_UPDATED', actorId: adminId, entityId: created.id, data: { changes: { capacity: 7 } } });

    // Usuarios
    id = rid('user-created');
    const email = `audit.${unique()}@salalibre.local`;
    const userRes = await api.request('POST', '/users', {
      cookie: admin,
      requestId: id,
      body: { name: 'Auditoría Uno', email, password: TEST_PASSWORD, role: 'EMPLOYEE' },
    });
    const user = await body<{ id: string }>(userRes);
    expect(await single(id)).toMatchObject({
      action: 'USER_CREATED',
      actorId: adminId,
      entity: 'user',
      entityId: user.id,
      data: { email, name: 'Auditoría Uno', role: 'EMPLOYEE' },
    });

    id = rid('user-updated');
    expect((await api.request('PATCH', `/users/${user.id}`, { cookie: admin, requestId: id, body: { name: 'Auditoría Dos' } })).status).toBe(200);
    expect(await single(id)).toMatchObject({ action: 'USER_UPDATED', actorId: adminId, entityId: user.id, data: { changes: { name: 'Auditoría Dos' } } });

    id = rid('password-reset');
    const reset = await api.request('POST', `/users/${user.id}/reset-password`, { cookie: admin, requestId: id, body: { newPassword: 'Reseteada123' } });
    expect(reset.status).toBe(204);
    expect(await single(id)).toMatchObject({ action: 'USER_PASSWORD_RESET', actorId: adminId, entityId: user.id, data: {} });

    const userCookie = await api.login(email, 'Reseteada123');
    id = rid('password-changed');
    const change = await api.request('PATCH', '/auth/password', {
      cookie: userCookie,
      requestId: id,
      body: { currentPassword: 'Reseteada123', newPassword: TEST_PASSWORD },
    });
    expect(change.status).toBe(204);
    expect(await single(id)).toMatchObject({ action: 'USER_PASSWORD_CHANGED', actorId: user.id, entityId: user.id, data: {} });

    // Reservas
    const day = nextBusinessDay();
    id = rid('booking-created');
    const booking = await body<BookingBody>(
      await api.request('POST', '/bookings', {
        cookie: userCookie,
        requestId: id,
        body: { roomId: room.id, startAt: at(day, '09:00'), endAt: at(day, '10:00'), title: 'Auditada', attendees: 2 },
      }),
    );
    expect(await single(id)).toMatchObject({
      action: 'BOOKING_CREATED',
      actorId: user.id,
      entity: 'booking',
      entityId: booking.id,
      data: { roomId: room.id, startAt: at(day, '09:00'), endAt: at(day, '10:00'), attendees: 2 },
    });

    // F-04: la cancela el ADMIN; el actor es el ADMIN.
    id = rid('booking-cancelled');
    expect((await api.request('POST', `/bookings/${booking.id}/cancel`, { cookie: admin, requestId: id })).status).toBe(200);
    expect(await single(id)).toMatchObject({
      action: 'BOOKING_CANCELLED',
      actorId: adminId,
      entityId: booking.id,
      data: { cause: 'MANUAL', ownerId: user.id },
    });

    // Cierres (sin reservas ese día: solo la fila del cierre)
    const closedDay = nextBusinessDay(4);
    id = rid('closure-created');
    const closure = await body<{ id: string }>(
      await api.request('POST', '/closures', { cookie: admin, requestId: id, body: { date: closedDay, reason: 'Auditoría' } }),
    );
    expect(await single(id)).toMatchObject({
      action: 'CLOSURE_CREATED',
      actorId: adminId,
      entity: 'closure',
      entityId: closure.id,
      data: { date: closedDay, reason: 'Auditoría', cancelledBookings: 0 },
    });

    id = rid('closure-deleted');
    expect((await api.request('DELETE', `/closures/${closure.id}`, { cookie: admin, requestId: id })).status).toBe(204);
    expect(await single(id)).toMatchObject({ action: 'CLOSURE_DELETED', actorId: adminId, entityId: closure.id, data: { date: closedDay } });
  });

  it('D-05 · P-12 · sin header X-Request-Id, la fila lleva el request ID generado que devuelve la respuesta', async () => {
    const res = await api.request('POST', '/rooms', {
      cookie: admin,
      body: { name: `Sala Audit ${unique()}`, capacity: 4, location: 'Piso 1', equipment: [] },
    });
    const generated = res.headers.get('x-request-id') ?? '';

    expect(res.status).toBe(201);
    expect(generated).toMatch(/^[0-9a-f-]{36}$/);
    expect(await single(generated)).toMatchObject({ action: 'ROOM_CREATED' });
    expect(await api.prisma.auditLog.count({ where: { requestId: '' } })).toBe(0);
  });

  it('D-05 · CA2 · las operaciones que fallan (409, 422) o cuya transacción se revierte no dejan fila', async () => {
    const day = nextBusinessDay(1);
    const emp1 = await api.login(SEED.emp1.email, SEED.emp1.password);
    const emp2 = await api.login(SEED.emp2.email, SEED.emp2.password);
    expect((await api.book(emp1, room.id, day, '09:00', '10:00')).status).toBe(201);
    const closedDay = nextBusinessDay(5);
    expect((await api.request('POST', '/closures', { cookie: admin, body: { date: closedDay, reason: 'Ya existe' } })).status).toBe(201);
    const existingEmail = (await api.createUser(admin)).email;

    const attempts: [string, Promise<Response>, number][] = [];
    const attempt = (label: string, expected: number, run: (id: string) => Promise<Response>) => {
      const id = rid(label);
      attempts.push([id, run(id), expected]);
    };
    // 409 en el INSERT: la transacción ya estaba abierta y se revierte.
    attempt('conflict', 409, (requestId) =>
      api.request('POST', '/bookings', {
        cookie: emp2,
        requestId,
        body: { roomId: room.id, startAt: at(day, '09:30'), endAt: at(day, '10:30'), title: 'Choque', attendees: 2 },
      }),
    );
    attempt('email-taken', 409, (requestId) =>
      api.request('POST', '/users', {
        cookie: admin,
        requestId,
        body: { name: 'Repetido', email: existingEmail, password: TEST_PASSWORD, role: 'EMPLOYEE' },
      }),
    );
    attempt('closure-exists', 409, (requestId) =>
      api.request('POST', '/closures', { cookie: admin, requestId, body: { date: closedDay, reason: 'Otra vez' } }),
    );
    // 422 dentro de la transacción (con el lock tomado) y fuera de ella.
    attempt('day-closed', 422, (requestId) =>
      api.request('POST', '/bookings', {
        cookie: emp1,
        requestId,
        body: { roomId: room.id, startAt: at(closedDay, '09:00'), endAt: at(closedDay, '10:00'), title: 'Cerrado', attendees: 2 },
      }),
    );
    attempt('self-deactivate', 422, (requestId) =>
      api.request('PATCH', `/users/${adminId}`, { cookie: admin, requestId, body: { isActive: false } }),
    );
    attempt('wrong-password', 422, (requestId) =>
      api.request('PATCH', '/auth/password', { cookie: emp1, requestId, body: { currentPassword: 'NoEsLaClave1', newPassword: 'Nueva123456' } }),
    );
    attempt('closure-past', 422, (requestId) =>
      api.request('POST', '/closures', { cookie: admin, requestId, body: { date: today(), reason: 'Hoy' } }),
    );

    for (const [id, pending, expected] of attempts) {
      const res = await pending;
      expect([id, res.status]).toEqual([id, expected]);
      expect(await rowsOf(id)).toEqual([]);
    }
  });

  it('RN-15 · CA3 · desactivar un usuario con k reservas futuras deja 1 USER_UPDATED y k BOOKING_CANCELLED', async () => {
    const user = await api.createUser(admin);
    const ids: string[] = [];
    for (const [offset, start, end] of [[0, '09:00', '10:00'], [0, '11:00', '12:00'], [2, '09:00', '10:00']] as const) {
      ids.push((await body<BookingBody>(await api.book(user.cookie, room.id, nextBusinessDay(offset), start, end))).id);
    }

    const id = rid('deactivate');
    expect((await api.request('PATCH', `/users/${user.id}`, { cookie: admin, requestId: id, body: { isActive: false } })).status).toBe(200);
    const rows = await rowsOf(id);

    expect(rows.filter((r) => r.action === 'USER_UPDATED')).toEqual([
      expect.objectContaining({ entityId: user.id, actorId: adminId, data: { changes: { isActive: false }, cancelledBookings: 3 } }),
    ]);
    const cancelled = rows.filter((r) => r.action === 'BOOKING_CANCELLED');
    expect(cancelled.map((r) => r.entityId).sort()).toEqual([...ids].sort());
    expect(cancelled.every((r) => r.actorId === adminId)).toBe(true);
    expect(cancelled[0].data).toEqual({ cause: 'USER_DEACTIVATED', ownerId: user.id });
    expect(rows).toHaveLength(4);
  });

  it('RN-16 · CA3 · crear un cierre con k reservas deja 1 CLOSURE_CREATED y k BOOKING_CANCELLED', async () => {
    const day = nextBusinessDay(3);
    const emp1 = await api.login(SEED.emp1.email, SEED.emp1.password);
    const emp2 = await api.login(SEED.emp2.email, SEED.emp2.password);
    const ids = [
      (await body<BookingBody>(await api.book(emp1, room.id, day, '09:00', '10:00'))).id,
      (await body<BookingBody>(await api.book(emp2, room.id, day, '10:00', '11:00'))).id,
    ];

    const id = rid('closure-cascade');
    const res = await api.request('POST', '/closures', { cookie: admin, requestId: id, body: { date: day, reason: 'Cascada' } });
    const closure = await body<{ id: string; cancelledBookings: number }>(res);
    const rows = await rowsOf(id);

    expect(closure.cancelledBookings).toBe(2);
    expect(rows.filter((r) => r.action === 'CLOSURE_CREATED').map((r) => r.entityId)).toEqual([closure.id]);
    expect(rows.filter((r) => r.action === 'BOOKING_CANCELLED').map((r) => r.entityId).sort()).toEqual([...ids].sort());
    expect(rows.filter((r) => r.action === 'BOOKING_CANCELLED').every((r) => (r.data as { cause: string }).cause === 'DAY_CLOSED')).toBe(true);
    expect(rows).toHaveLength(3);
  });

  it('S-02 · CA4 · iniciar sesión (correcto o incorrecto) y cerrarla no insertan filas', async () => {
    const before = await api.prisma.auditLog.count();
    const ok = rid('login-ok');
    const bad = rid('login-bad');

    const cookie = await api.request('POST', '/auth/login', { requestId: ok, body: SEED.emp1 });
    await api.request('POST', '/auth/login', { requestId: bad, body: { email: SEED.emp1.email, password: 'incorrecta' } });
    await api.request('POST', '/auth/logout', { cookie: cookie.headers.getSetCookie()[0]?.split(';')[0] });

    expect(await api.prisma.auditLog.count()).toBe(before);
    expect([...(await rowsOf(ok)), ...(await rowsOf(bad))]).toEqual([]);
  });

  it('D-05 · P-12 · CA7 · la base rechaza UPDATE, DELETE y TRUNCATE sobre audit_logs', async () => {
    const before = await api.prisma.auditLog.count();
    expect(before).toBeGreaterThan(0);

    await expect(api.prisma.$executeRawUnsafe(`UPDATE audit_logs SET entity = 'otro'`)).rejects.toThrow(/inmutable/);
    await expect(api.prisma.$executeRawUnsafe('DELETE FROM audit_logs')).rejects.toThrow(/inmutable/);
    await expect(api.prisma.$executeRawUnsafe('TRUNCATE audit_logs')).rejects.toThrow(/inmutable/);
    await expect(api.prisma.auditLog.deleteMany({})).rejects.toThrow();
    expect(await api.prisma.auditLog.count()).toBe(before);
  });

  it('D-05 · spec §11 · 20 reservas simultáneas al mismo bloque → 1 × 201 y una sola fila BOOKING_CREATED entre sus request ID', async () => {
    const day = nextBusinessDay(2);
    const users = await Promise.all(Array.from({ length: 20 }, () => api.createUser(admin)));
    const ids = users.map(() => rid('burst'));

    const responses = await Promise.all(
      users.map((u, i) =>
        api.request('POST', '/bookings', {
          cookie: u.cookie,
          requestId: ids[i],
          body: { roomId: room.id, startAt: at(day, '14:00'), endAt: at(day, '15:00'), title: 'Ráfaga', attendees: 2 },
        }),
      ),
    );
    const rows = await api.prisma.auditLog.findMany({ where: { requestId: { in: ids } } });
    const winner = responses.findIndex((r) => r.status === 201);

    expect(statusCount(responses)).toEqual({ 201: 1, 409: 19 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'BOOKING_CREATED', requestId: ids[winner], actorId: users[winner].id });
  });
});

describe('Integración · consulta de auditoría (RN-25, P-15)', () => {
  let api: IntegrationApp;
  let admin: string;

  beforeAll(async () => {
    api = await IntegrationApp.start();
    admin = await api.login(SEED.admin.email, SEED.admin.password);
    // Garantiza filas de hoy con varias acciones, aunque este archivo corra solo.
    const room = await api.createRoom(admin);
    await api.request('PATCH', `/rooms/${room.id}`, { cookie: admin, body: { capacity: 3 } });
    await api.createUser(admin);
  });

  afterAll(async () => {
    await api.close();
  });

  const search = async (criteria: unknown) => {
    const res = await api.request('POST', '/audit-logs/search', { cookie: admin, body: criteria });
    return { status: res.status, page: await body<AuditPageBody>(res) };
  };

  it('RN-25 · P-15 · sin filtros: page 1, pageSize 20, total igual al COUNT de la base y orden por createdAt desc', async () => {
    const { status, page } = await search({});
    const dates = page.items.map((i) => new Date(i.createdAt).getTime());

    expect(status).toBe(200);
    expect([page.page, page.pageSize]).toEqual([1, 20]);
    expect(page.total).toBe(await api.prisma.auditLog.count());
    expect(page.items).toHaveLength(Math.min(20, page.total));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(page.items[0].actor).toEqual({ id: expect.any(String), name: expect.any(String) });
  });

  it('RN-25 · P-15 · las páginas no repiten ni saltan filas', async () => {
    const big = await search({ page: 1, pageSize: 6 });
    const p1 = await search({ page: 1, pageSize: 3 });
    const p2 = await search({ page: 2, pageSize: 3 });

    expect([...p1.page.items, ...p2.page.items].map((i) => i.id)).toEqual(big.page.items.map((i) => i.id));
    expect(p2.page.total).toBe(big.page.total);
  });

  it('RN-25 · P-15 · filtra por action con un total que respeta el filtro', async () => {
    const { page } = await search({ action: 'ROOM_UPDATED', pageSize: 100 });

    expect(page.total).toBe(await api.prisma.auditLog.count({ where: { action: 'ROOM_UPDATED' } }));
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.every((i) => i.action === 'ROOM_UPDATED')).toBe(true);
  });

  it('RN-25 · P-15 · from y to (AAAA-MM-DD en BUSINESS_TZ) son inclusivos', async () => {
    const day = today();
    const onlyToday = await search({ from: day, to: day, action: 'USER_CREATED' });
    const fromTomorrow = await search({ from: addDays(day, 1) });
    const untilYesterday = await search({ to: addDays(day, -1), action: 'USER_CREATED' });

    expect(onlyToday.page.total).toBe(await api.prisma.auditLog.count({ where: { action: 'USER_CREATED' } }));
    expect(onlyToday.page.total).toBeGreaterThan(0);
    expect(fromTomorrow.page.total).toBe(0);
    expect(untilYesterday.page.total).toBe(0);
  });

  it.each([
    ['pageSize 101', { pageSize: 101 }],
    ['pageSize 0', { pageSize: 0 }],
    ['page 0', { page: 0 }],
    ['from mal formada', { from: '15/11/2026' }],
    ['action inválida', { action: 'LOGIN' }],
  ])('RN-25 · P-15 · %s → 400 VALIDATION_ERROR', async (_, criteria) => {
    const res = await api.request('POST', '/audit-logs/search', { cookie: admin, body: criteria });

    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe('VALIDATION_ERROR');
  });

  it('D-24 · CA7 · no hay GET de auditoría: los filtros nunca viajan en la URL', async () => {
    expect((await api.request('GET', '/audit-logs', { cookie: admin })).status).toBe(404);
    expect((await api.request('GET', '/audit-logs/search?page=1', { cookie: admin })).status).toBe(404);
  });
});
