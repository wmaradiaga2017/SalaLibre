import type { INestApplication } from '@nestjs/common';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOMS_REPOSITORY } from '../src/modules/rooms/domain/rooms.repository';
import { RoomsModule } from '../src/modules/rooms/rooms.module';
import { createApp, json, sessionCookie } from './support/auth-app';
import { InMemoryRoomsRepository } from './support/in-memory-rooms.repository';
import {
  InMemoryTransactionRunner,
  InMemoryUsersRepository,
  TEST_PASSWORD,
} from './support/in-memory-users.repository';

interface RoomBody {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: string[];
  isActive: boolean;
}

const COPAN = 'a1111111-1111-4111-8111-111111111111';
const MISSING = 'b9999999-9999-4999-8999-999999999999';

describe('Módulo de salas (T04)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let rooms: InMemoryRoomsRepository;
  let runner: InMemoryTransactionRunner;
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

  const send = (method: 'POST' | 'PATCH', path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });

  const valid = { name: 'Sala Nueva', capacity: 6, location: 'Piso 1', equipment: ['TV', 'WHITEBOARD'] };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '8h';
    process.env.NODE_ENV = 'test';
    rooms = new InMemoryRoomsRepository();
    runner = new InMemoryTransactionRunner();
    ({ app, baseUrl } = await createApp(new InMemoryUsersRepository(), {
      runner,
      modules: [RoomsModule],
      overrides: [{ token: ROOMS_REPOSITORY, value: rooms }],
    }));
    admin = await login('admin@salalibre.local');
    employee = await login('empleado1@salalibre.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('RN-09 · GET /rooms: EMPLOYEE recibe solo las activas y ADMIN todas, ordenadas por name', async () => {
    const asEmployee = await fetch(`${baseUrl}/rooms`, { headers: { Cookie: employee } });
    const asAdmin = await fetch(`${baseUrl}/rooms`, { headers: { Cookie: admin } });
    const employeeRooms = await json<RoomBody[]>(asEmployee);
    const adminRooms = await json<RoomBody[]>(asAdmin);

    expect([asEmployee.status, asAdmin.status]).toEqual([200, 200]);
    expect(employeeRooms.map((r) => r.name)).toEqual(['Sala Copán', 'Sala Roatán']);
    expect(adminRooms.map((r) => r.name)).toEqual(['Sala Antigua', 'Sala Copán', 'Sala Roatán']);
    expect(Object.keys(adminRooms[0]).sort()).toEqual(['capacity', 'equipment', 'id', 'isActive', 'location', 'name']);
  });

  it('RN-21 · sin sesión → 401 en GET, POST y PATCH /rooms', async () => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/rooms`),
      send('POST', '/rooms', valid),
      send('PATCH', `/rooms/${COPAN}`, { capacity: 9 }),
    ]);

    expect(responses.map((r) => r.status)).toEqual([401, 401, 401]);
  });

  it('RN-21 · EMPLOYEE en POST o PATCH /rooms → 403 FORBIDDEN, aunque el body sea inválido', async () => {
    const responses = await Promise.all([
      send('POST', '/rooms', valid, employee),
      send('PATCH', `/rooms/${COPAN}`, { isActive: false }, employee),
      send('POST', '/rooms', { name: '' }, employee),
    ]);
    const codes = await Promise.all(responses.map(async (r) => (await json(r)).error.code));

    expect(responses.map((r) => r.status)).toEqual([403, 403, 403]);
    expect(codes).toEqual(['FORBIDDEN', 'FORBIDDEN', 'FORBIDDEN']);
    expect(rooms.rooms.find((r) => r.id === COPAN)?.isActive).toBe(true);
  });

  it('RN-22 · ADMIN crea una sala válida → 201 con la Room, activa y dentro de una transacción', async () => {
    const runsBefore = runner.runs;
    const res = await send('POST', '/rooms', valid, admin);
    const room = await json<RoomBody>(res);

    expect(res.status).toBe(201);
    expect(room).toEqual({ id: expect.any(String), ...valid, isActive: true });
    expect(runner.runs).toBe(runsBefore + 1);
  });

  it('RN-22 · nombre repetido sin distinguir mayúsculas al crear o editar → 409 ROOM_NAME_TAKEN', async () => {
    const created = await send('POST', '/rooms', { ...valid, name: 'sala copán' }, admin);
    const edited = await send('PATCH', `/rooms/a2222222-2222-4222-8222-222222222222`, { name: 'SALA COPÁN' }, admin);
    const sameRoom = await send('PATCH', `/rooms/${COPAN}`, { name: 'Sala Copán' }, admin);

    expect([created.status, edited.status]).toEqual([409, 409]);
    expect((await json(created)).error.code).toBe('ROOM_NAME_TAKEN');
    expect((await json(edited)).error.code).toBe('ROOM_NAME_TAKEN');
    expect(sameRoom.status).toBe(200); // renombrarse con su propio nombre no choca
  });

  it('RN-22 · capacidad, nombre, ubicación o equipamiento fuera de las reglas → 400 VALIDATION_ERROR', async () => {
    const invalid = [
      { ...valid, capacity: 0 },
      { ...valid, capacity: 101 },
      { ...valid, capacity: 4.5 },
      { ...valid, capacity: '6' },
      { ...valid, name: '' },
      { ...valid, name: 'x'.repeat(61) },
      { ...valid, location: '' },
      { ...valid, location: 'x'.repeat(101) },
      { ...valid, equipment: ['TV', 'TV'] },
      { ...valid, equipment: ['CAFETERA'] },
      { ...valid, equipment: 'TV' },
      { name: 'Sin equipo', capacity: 4, location: 'Piso 1' },
      { ...valid, isActive: false },
      { ...valid, extra: 1 },
    ];
    const responses = await Promise.all(invalid.map((b) => send('POST', '/rooms', b, admin)));
    const codes = await Promise.all(responses.map(async (r) => (await json(r)).error.code));

    expect(responses.map((r) => r.status)).toEqual(invalid.map(() => 400));
    expect(new Set(codes)).toEqual(new Set(['VALIDATION_ERROR']));
  });

  it('RN-22 · PATCH con valores inválidos o null → 400 VALIDATION_ERROR y la sala no cambia', async () => {
    const before = await rooms.findById(COPAN);
    const invalid = [{ capacity: 0 }, { name: null }, { equipment: ['TV', 'TV'] }, { isActive: 'no' }, { id: MISSING }];
    const responses = await Promise.all(invalid.map((b) => send('PATCH', `/rooms/${COPAN}`, b, admin)));

    expect(responses.map((r) => r.status)).toEqual(invalid.map(() => 400));
    expect(await rooms.findById(COPAN)).toEqual(before);
  });

  it('D-14 · PATCH { isActive: false } → 200, la sala queda inactiva sin borrarse y no existe DELETE', async () => {
    const created = await json<RoomBody>(await send('POST', '/rooms', { ...valid, name: 'Sala Temporal' }, admin));
    const res = await send('PATCH', `/rooms/${created.id}`, { isActive: false }, admin);
    const body = await json<RoomBody>(res);
    const asEmployee = await json<RoomBody[]>(await fetch(`${baseUrl}/rooms`, { headers: { Cookie: employee } }));
    const asAdmin = await json<RoomBody[]>(await fetch(`${baseUrl}/rooms`, { headers: { Cookie: admin } }));
    const del = await fetch(`${baseUrl}/rooms/${created.id}`, { method: 'DELETE', headers: { Cookie: admin } });

    expect(res.status).toBe(200);
    expect(body).toEqual({ ...created, isActive: false });
    expect(asEmployee.some((r) => r.id === created.id)).toBe(false);
    expect(asAdmin.some((r) => r.id === created.id)).toBe(true);
    expect(del.status).toBe(404);
  });

  it('RN-22 · PATCH parcial solo cambia los campos enviados', async () => {
    const res = await send('PATCH', `/rooms/${COPAN}`, { capacity: 9, equipment: [] }, admin);

    expect(res.status).toBe(200);
    expect(await json<RoomBody>(res)).toEqual({
      id: COPAN,
      name: 'Sala Copán',
      capacity: 9,
      location: 'Piso 1',
      equipment: [],
      isActive: true,
    });
  });

  it('D-06 · PATCH a un id inexistente → 404 NOT_FOUND; a un id que no es UUID → 400 VALIDATION_ERROR', async () => {
    const missing = await send('PATCH', `/rooms/${MISSING}`, { capacity: 5 }, admin);
    const notUuid = await send('PATCH', '/rooms/no-es-uuid', { capacity: 5 }, admin);

    expect(missing.status).toBe(404);
    expect((await json(missing)).error.code).toBe('NOT_FOUND');
    expect(notUuid.status).toBe(400);
    expect((await json(notUuid)).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Capas del módulo de salas (T04, CA8)', () => {
  const dir = join(__dirname, '..', 'src', 'modules', 'rooms');
  const files = (path: string): string[] =>
    readdirSync(path, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(path, e.name)) : e.name.endsWith('.ts') ? [join(path, e.name)] : [],
    );
  const imports = (file: string) => [...readFileSync(file, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]);

  it('CLAUDE.md · rooms no importa el módulo de reservas y el controller no importa Prisma ni repositorios', () => {
    const all = files(dir).flatMap(imports);
    const controller = imports(join(dir, 'rooms.controller.ts'));

    expect(all.filter((i) => /bookings/.test(i))).toEqual([]);
    expect(controller.filter((i) => /prisma|repository/i.test(i))).toEqual([]);
  });

  it('CLAUDE.md · el dominio de salas no importa @nestjs, @prisma ni Prisma', () => {
    const domain = files(join(dir, 'domain')).flatMap(imports);

    expect(domain.filter((i) => /@nestjs|@prisma|prisma/i.test(i))).toEqual([]);
  });
});
