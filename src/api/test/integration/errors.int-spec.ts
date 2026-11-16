import { IntegrationApp, SEED, TEST_PASSWORD, body, nextBusinessDay, unique, type RoomBody } from './support/int-app';

// T06 · P-16 (RN-18, RN-22, RN-23) y P-17 (D-06) contra la app completa y PostgreSQL real.
describe('Integración · validaciones y formato de error', () => {
  let api: IntegrationApp;
  let admin: string;
  let emp1: string;
  let room: RoomBody;

  beforeAll(async () => {
    api = await IntegrationApp.start();
    admin = await api.login(SEED.admin.email, SEED.admin.password);
    emp1 = await api.login(SEED.emp1.email, SEED.emp1.password);
    room = await api.createRoom(admin, 4);
  });

  beforeEach(() => api.reset());

  afterAll(async () => {
    await api.reset();
    await api.close();
  });

  describe('P-16 · contraseñas, correos y nombres de sala', () => {
    it('RN-18 · contraseña nueva de menos de 8 caracteres → 400 VALIDATION_ERROR (cambio propio y alta)', async () => {
      const user = await api.createUser(admin);
      const change = await api.request('PATCH', '/auth/password', {
        cookie: user.cookie,
        body: { currentPassword: TEST_PASSWORD, newPassword: 'Corta12' },
      });
      expect(change.status).toBe(400);
      expect((await body(change)).error.code).toBe('VALIDATION_ERROR');

      const create = await api.request('POST', '/users', {
        cookie: admin,
        body: { name: 'Corta', email: `corta.${unique()}@salalibre.local`, password: 'Corta12', role: 'EMPLOYEE' },
      });
      expect(create.status).toBe(400);
    });

    it('RN-18 · contraseña actual incorrecta → 422 INVALID_CURRENT_PASSWORD y la contraseña no cambia', async () => {
      const user = await api.createUser(admin);
      const res = await api.request('PATCH', '/auth/password', {
        cookie: user.cookie,
        body: { currentPassword: 'NoEsLaActual1', newPassword: 'OtraClave123' },
      });
      expect(res.status).toBe(422);
      expect((await body(res)).error.code).toBe('INVALID_CURRENT_PASSWORD');
      expect(await api.login(user.email, TEST_PASSWORD)).toMatch(/^access_token=/);
    });

    it('RN-18 · contraseña actual correcta → 204 y la nueva sirve para iniciar sesión', async () => {
      const user = await api.createUser(admin);
      const res = await api.request('PATCH', '/auth/password', {
        cookie: user.cookie,
        body: { currentPassword: TEST_PASSWORD, newPassword: 'OtraClave123' },
      });
      expect(res.status).toBe(204);
      expect(await api.login(user.email, 'OtraClave123')).toMatch(/^access_token=/);
    });

    it('RN-23 · correo repetido (también con otras mayúsculas) → 409 EMAIL_TAKEN', async () => {
      const user = await api.createUser(admin);
      for (const email of [user.email, user.email.toUpperCase()]) {
        const res = await api.request('POST', '/users', {
          cookie: admin,
          body: { name: 'Repetido', email, password: TEST_PASSWORD, role: 'EMPLOYEE' },
        });
        expect(res.status).toBe(409);
        expect((await body(res)).error.code).toBe('EMAIL_TAKEN');
      }
    });

    it('RN-22 · nombre de sala repetido (sin distinguir mayúsculas) → 409 ROOM_NAME_TAKEN, al crear y al renombrar', async () => {
      const create = await api.request('POST', '/rooms', {
        cookie: admin,
        body: { name: room.name.toUpperCase(), capacity: 4, location: 'Piso 1', equipment: [] },
      });
      expect(create.status).toBe(409);
      expect((await body(create)).error.code).toBe('ROOM_NAME_TAKEN');

      const other = await api.createRoom(admin, 4);
      const rename = await api.request('PATCH', `/rooms/${other.id}`, { cookie: admin, body: { name: room.name } });
      expect(rename.status).toBe(409);
      expect((await body(rename)).error.code).toBe('ROOM_NAME_TAKEN');
    });
  });

  describe('P-17 · formato único de error', () => {
    const day = nextBusinessDay();

    /** Una petición por cada estado de error del spec §8 (400, 401, 403, 404, 409, 422). */
    const cases = (): [string, number, () => Promise<Response>][] => [
      ['400 cuerpo inválido', 400, () => api.request('POST', '/bookings', { cookie: emp1, body: { roomId: 'x' } })],
      ['400 campo no permitido', 400, () => api.request('PATCH', '/auth/password', { cookie: emp1, body: { x: 1 } })],
      ['401 sin sesión', 401, () => api.request('GET', '/auth/me')],
      ['401 credenciales', 401, () => api.request('POST', '/auth/login', { body: { email: SEED.emp1.email, password: 'x' } })],
      ['403 rol', 403, () => api.request('GET', '/users', { cookie: emp1 })],
      [
        '404 recurso',
        404,
        () => api.request('POST', '/bookings/00000000-0000-4000-8000-000000000000/cancel', { cookie: emp1 }),
      ],
      [
        '409 choque',
        409,
        async () => {
          await api.book(emp1, room.id, day, '10:00', '11:00');
          return api.book(emp1, room.id, day, '10:00', '11:00');
        },
      ],
      ['422 regla', 422, () => api.book(emp1, room.id, day, '10:00', '11:00', { attendees: 99 })],
    ];

    it('D-06 · todo error trae { error: { code, message, requestId } }, sin stack trace, y el header X-Request-Id', async () => {
      for (const [name, status, call] of cases()) {
        const res = await call();
        const text = await res.text();
        expect({ name, status: res.status }).toEqual({ name, status });

        const parsed = JSON.parse(text) as Record<string, unknown>;
        expect({ name, keys: Object.keys(parsed) }).toEqual({ name, keys: ['error'] });
        const error = parsed.error as Record<string, unknown>;
        expect({ name, keys: Object.keys(error).sort() }).toEqual({ name, keys: ['code', 'message', 'requestId'] });
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(error.requestId).toBe(res.headers.get('x-request-id'));
        expect({ name, stack: /stack|\bat .+:\d+:\d+|node_modules|\.ts:\d+/i.test(text) }).toEqual({
          name,
          stack: false,
        });
      }
    });

    it('D-06 · el X-Request-Id del cliente válido se respeta en el header y en el error', async () => {
      const id = `int-${unique()}`;
      const res = await fetch(`${api.baseUrl}/auth/me`, { headers: { 'X-Request-Id': id } });
      expect(res.status).toBe(401);
      expect(res.headers.get('x-request-id')).toBe(id);
      expect((await body(res)).error.requestId).toBe(id);
    });
  });
});
