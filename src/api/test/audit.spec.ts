import type { INestApplication } from '@nestjs/common';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadBusinessConfig } from '../src/common/config/business-config';
import { runWithRequestContext } from '../src/common/request-context/request-context';
import type { TransactionContext } from '../src/common/transaction/transaction-runner';
import { AuditModule } from '../src/modules/audit/audit.module';
import { AuditService } from '../src/modules/audit/audit.service';
import { compactData, secretKeys, type AuditPage } from '../src/modules/audit/domain/audit';
import { ROOMS_REPOSITORY } from '../src/modules/rooms/domain/rooms.repository';
import { RoomsModule } from '../src/modules/rooms/rooms.module';
import { createApp, json, sessionCookie } from './support/auth-app';
import { InMemoryAuditRepository } from './support/in-memory-audit.repository';
import { InMemoryRoomsRepository } from './support/in-memory-rooms.repository';
import { InMemoryUsersRepository, TEST_PASSWORD } from './support/in-memory-users.repository';

/** T06a · Auditoría con repositorios en memoria. El rollback real (CA2) y P-12/P-15 van en la suite de integración. */

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';

describe('Auditoría (T06a, HTTP sin base)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let audit: InMemoryAuditRepository;
  let admin: string;
  let employee: string;

  const login = async (email: string) =>
    sessionCookie(
      await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: TEST_PASSWORD }),
      }),
    );

  const send = (method: string, path: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const search = (body: unknown, cookie = admin) => send('POST', '/audit-logs/search', body, cookie);

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '8h';
    process.env.NODE_ENV = 'test';
    audit = new InMemoryAuditRepository();
    ({ app, baseUrl } = await createApp(new InMemoryUsersRepository(), {
      audit,
      modules: [RoomsModule, AuditModule],
      overrides: [{ token: ROOMS_REPOSITORY, value: new InMemoryRoomsRepository() }],
    }));
    admin = await login('admin@salalibre.local');
    employee = await login('empleado1@salalibre.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('S-02 · CA4 · iniciar sesión no inserta filas de auditoría', async () => {
    const before = audit.rows.length;
    await login('admin@salalibre.local');
    await login('empleado1@salalibre.local');

    expect(audit.rows.length).toBe(before);
  });

  it('D-05 · CA1 · crear una sala inserta 1 ROOM_CREATED con actor, entidad, request ID del header y data sin secretos', async () => {
    const before = audit.rows.length;
    const res = await send(
      'POST',
      '/rooms',
      { name: 'Sala Auditada', capacity: 4, location: 'Piso 3', equipment: ['TV'] },
      admin,
      { 'X-Request-Id': 'req-audit-room-1' },
    );
    const room = await json<{ id: string }>(res);

    expect(res.status).toBe(201);
    expect(audit.rows.length).toBe(before + 1);
    expect(audit.rows.at(-1)).toMatchObject({
      actorId: ADMIN_ID,
      action: 'ROOM_CREATED',
      entity: 'room',
      entityId: room.id,
      requestId: 'req-audit-room-1',
      data: { name: 'Sala Auditada', capacity: 4, location: 'Piso 3', equipment: ['TV'] },
    });
    expect(res.headers.get('x-request-id')).toBe('req-audit-room-1');
  });

  it('D-05 · CA1 · ROOM_UPDATED guarda solo los campos enviados en el PATCH', async () => {
    const created = await json<{ id: string }>(
      await send('POST', '/rooms', { name: 'Sala Parche', capacity: 4, location: 'Piso 3', equipment: [] }, admin),
    );
    const res = await send('PATCH', `/rooms/${created.id}`, { capacity: 6 }, admin);

    expect(res.status).toBe(200);
    expect(audit.rows.at(-1)).toMatchObject({ action: 'ROOM_UPDATED', entityId: created.id, data: { changes: { capacity: 6 } } });
    expect(Object.keys(audit.rows.at(-1)?.data.changes as object)).toEqual(['capacity']);
  });

  it('RN-18 · CA1 · cambiar la contraseña propia inserta 1 USER_PASSWORD_CHANGED sin la contraseña ni el hash', async () => {
    const before = audit.rows.length;
    const res = await send('PATCH', '/auth/password', { currentPassword: TEST_PASSWORD, newPassword: 'OtraClave123' }, employee);
    const row = audit.rows.at(-1);

    expect(res.status).toBe(204);
    expect(audit.rows.length).toBe(before + 1);
    expect(row).toMatchObject({ action: 'USER_PASSWORD_CHANGED', entity: 'user', data: {} });
    expect(JSON.stringify(row)).not.toMatch(/OtraClave123|Empleado12345|\$2[aby]\$/);
    // Se restaura la contraseña para no afectar a otras pruebas.
    await send('PATCH', '/auth/password', { currentPassword: 'OtraClave123', newPassword: TEST_PASSWORD }, employee);
  });

  it('D-05 · CA2 · una operación que falla (409, 422, 404) no deja fila de auditoría', async () => {
    await send('POST', '/rooms', { name: 'Sala Repetida', capacity: 4, location: 'Piso 3', equipment: [] }, admin);
    const before = audit.rows.length;

    const conflict = await send('POST', '/rooms', { name: 'sala repetida', capacity: 4, location: 'Piso 3', equipment: [] }, admin);
    const missing = await send('PATCH', '/rooms/b9999999-9999-4999-8999-999999999999', { capacity: 5 }, admin);
    const wrong = await send('PATCH', '/auth/password', { currentPassword: 'NoEsLaClave1', newPassword: 'OtraClave123' }, employee);

    expect([conflict.status, missing.status, wrong.status]).toEqual([409, 404, 422]);
    expect(audit.rows.length).toBe(before);
  });

  it('RN-25 · CA5 · ADMIN: 200 con items, page 1 y pageSize 20 por defecto, total, orden por createdAt desc y sin data', async () => {
    const res = await search({});
    const page = await json<AuditPage & { items: Record<string, unknown>[] }>(res);
    const dates = page.items.map((i) => String(i.createdAt));

    expect(res.status).toBe(200);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(20);
    expect(page.total).toBe(audit.rows.length);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(Object.keys(page.items[0]).sort()).toEqual(['action', 'actor', 'createdAt', 'entity', 'entityId', 'id', 'requestId']);
    expect(page.items[0].actor).toEqual({ id: ADMIN_ID, name: expect.any(String) });
  });

  it('RN-25 · CA5 · pagina con page y pageSize, y filtra por action con un total que respeta el filtro', async () => {
    const all = await json<AuditPage>(await search({ pageSize: 100 }));
    const second = await json<AuditPage>(await search({ page: 2, pageSize: 2 }));
    const created = await json<AuditPage>(await search({ action: 'ROOM_CREATED' }));

    expect(second.items.map((i) => i.id)).toEqual(all.items.slice(2, 4).map((i) => i.id));
    expect(created.total).toBe(audit.rows.filter((r) => r.action === 'ROOM_CREATED').length);
    expect(created.items.every((i) => i.action === 'ROOM_CREATED')).toBe(true);
  });

  it('RN-25 · CA5 · from y to son días de BUSINESS_TZ incluidos', async () => {
    // El repositorio en memoria fecha las filas desde 2026-01-01T00:00Z, que en Tegucigalpa (UTC-6) es el 31 de diciembre.
    const dec31 = await json<AuditPage>(await search({ from: '2025-12-31', to: '2025-12-31', pageSize: 100 }));
    const jan1 = await json<AuditPage>(await search({ from: '2026-01-01', pageSize: 100 }));

    expect(dec31.total).toBe(audit.rows.length);
    expect(jan1.total).toBe(0);
  });

  it.each([
    ['pageSize 101', { pageSize: 101 }],
    ['pageSize 0', { pageSize: 0 }],
    ['page 0', { page: 0 }],
    ['page decimal', { page: 1.5 }],
    ['page como texto', { page: '1' }],
    ['page absurda (OFFSET fuera de rango)', { page: 99_999_999 }],
    ['from mal formada', { from: '2026-13-01' }],
    ['to con hora', { to: '2026-11-15T00:00:00Z' }],
    ['action inválida', { action: 'USER_LOGGED_IN' }],
    ['action null', { action: null }],
    ['campo no permitido', { sort: 'asc' }],
  ])('RN-25 · CA6 · %s → 400 VALIDATION_ERROR', async (_, body) => {
    const res = await search(body);

    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe('VALIDATION_ERROR');
  });

  it('RN-21 · CA6 · EMPLOYEE → 403 y sin sesión → 401', async () => {
    const asEmployee = await search({}, employee);
    const anonymous = await send('POST', '/audit-logs/search', {});

    expect(asEmployee.status).toBe(403);
    expect(anonymous.status).toBe(401);
  });

  it('D-24 · CA7 · no existe GET de auditoría ni rutas que la modifiquen', async () => {
    const responses = await Promise.all([
      send('GET', '/audit-logs', undefined, admin),
      send('GET', '/audit-logs/search', undefined, admin),
      send('PATCH', '/audit-logs/search', {}, admin),
      send('DELETE', '/audit-logs/search', undefined, admin),
    ]);

    expect(responses.map((r) => r.status)).toEqual([404, 404, 404, 404]);
  });
});

describe('AuditService (T06a, unitarias)', () => {
  const ctx: TransactionContext = { advisoryLock: async () => undefined };
  const service = (repo = new InMemoryAuditRepository()) => ({ repo, audit: new AuditService(repo, loadBusinessConfig({})) });

  it('D-05 · sin contexto de petición (sin request ID ni actor) falla y no inserta: la transacción se revierte', async () => {
    const { repo, audit } = service();

    await expect(audit.record(ctx, { action: 'ROOM_CREATED', entity: 'room', entityId: 'r1' })).rejects.toThrow(/contexto/);
    await expect(
      runWithRequestContext({ requestId: 'r', actorId: null }, () =>
        audit.record(ctx, { action: 'ROOM_CREATED', entity: 'room', entityId: 'r1' }),
      ),
    ).rejects.toThrow(/contexto/);
    expect(repo.rows).toEqual([]);
  });

  it('D-05 · spec §7 · rechaza data con contraseñas, hashes, cookies o tokens', async () => {
    const { repo, audit } = service();
    const attempt = (data: Record<string, unknown>) =>
      runWithRequestContext({ requestId: 'r', actorId: ADMIN_ID }, () =>
        audit.record(ctx, { action: 'USER_CREATED', entity: 'user', entityId: 'u1', data: data as never }),
      );

    await expect(attempt({ password: 'x' })).rejects.toThrow(/secretos/);
    await expect(attempt({ changes: { passwordHash: 'x' } })).rejects.toThrow(/secretos/);
    await expect(attempt({ list: [{ accessToken: 'x' }] })).rejects.toThrow(/secretos/);
    expect(repo.rows).toEqual([]);
  });

  it('RN-15 · recordMany inserta una fila por entrada con el mismo actor y request ID', async () => {
    const { repo, audit } = service();

    await runWithRequestContext({ requestId: 'req-many', actorId: ADMIN_ID }, () =>
      audit.recordMany(ctx, ['b1', 'b2', 'b3'].map((id) => ({ action: 'BOOKING_CANCELLED', entity: 'booking', entityId: id }))),
    );

    expect(repo.rows.map((r) => [r.entityId, r.actorId, r.requestId])).toEqual([
      ['b1', ADMIN_ID, 'req-many'],
      ['b2', ADMIN_ID, 'req-many'],
      ['b3', ADMIN_ID, 'req-many'],
    ]);
  });

  it('B-80 · compactData quita los campos undefined, también anidados', () => {
    expect(compactData({ a: 1, b: undefined, c: { d: undefined, e: null } })).toEqual({ a: 1, c: { e: null } });
    expect(secretKeys({ email: 'a@b.c', cancelledBookings: 2 })).toEqual([]);
  });
});

describe('Capas del módulo de auditoría (T06a)', () => {
  const root = join(__dirname, '..', 'src', 'modules');
  const files = (path: string): string[] =>
    readdirSync(path, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(path, e.name)) : e.name.endsWith('.ts') ? [join(path, e.name)] : [],
    );
  const imports = (file: string) => [...readFileSync(file, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]);

  it('CLAUDE.md · audit no importa otros módulos; el controller no importa Prisma ni repositorios; el dominio es puro', () => {
    const dir = join(root, 'audit');
    const all = files(dir).flatMap(imports);

    expect(all.filter((i) => /\.\.\/(auth|bookings|rooms|users|closures)\//.test(i))).toEqual([]);
    expect(imports(join(dir, 'audit.controller.ts')).filter((i) => /prisma|repository/i.test(i))).toEqual([]);
    expect(files(join(dir, 'domain')).flatMap(imports).filter((i) => /@nestjs|@prisma|prisma/i.test(i))).toEqual([]);
  });

  it('CLAUDE.md · los demás módulos usan solo AuditService o AuditModule, nunca archivos internos de audit', () => {
    const foreign = ['auth', 'bookings', 'rooms', 'users', 'closures']
      .flatMap((m) => files(join(root, m)))
      .flatMap(imports)
      .filter((i) => /\/audit\//.test(i));

    expect(foreign.length).toBeGreaterThan(0);
    expect(foreign.filter((i) => !/\/audit\/audit\.(service|module)$/.test(i))).toEqual([]);
  });

  it('D-05 · cada operación de escritura de spec §7 llama a la auditoría con su AuditAction', () => {
    const source = ['auth', 'bookings', 'rooms', 'users', 'closures']
      .flatMap((m) => files(join(root, m)))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    const actions = [...source.matchAll(/action: '([A-Z_]+)'/g)].map((m) => m[1]);

    expect([...new Set(actions)].sort()).toEqual(
      [
        'BOOKING_CANCELLED',
        'BOOKING_CREATED',
        'CLOSURE_CREATED',
        'CLOSURE_DELETED',
        'ROOM_CREATED',
        'ROOM_UPDATED',
        'USER_CREATED',
        'USER_PASSWORD_CHANGED',
        'USER_PASSWORD_RESET',
        'USER_UPDATED',
      ].sort(),
    );
  });
});
