import { IntegrationApp, SEED, body, nextBusinessDay } from './support/int-app';

// T06 · P-14 (RN-21, D-03): matriz de roles de cada ruta del spec §8 contra la app completa y PostgreSQL real.
// Los ids son UUID que no existen: el 401 y el 403 se deciden antes de buscar el recurso (D-32), así que la matriz no
// toca datos. El body es válido para no confundir un 403 con un 400 del ValidationPipe.
const MISSING = '00000000-0000-4000-8000-000000000000';

interface Route {
  method: string;
  path: string;
  body?: unknown;
}

/** Rutas solo ADMIN (RN-21). */
const ADMIN_ROUTES: Route[] = [
  { method: 'POST', path: '/rooms', body: { name: 'Sala RBAC', capacity: 4, location: 'Piso 9', equipment: [] } },
  { method: 'PATCH', path: `/rooms/${MISSING}`, body: { capacity: 5 } },
  { method: 'GET', path: '/users' },
  {
    method: 'POST',
    path: '/users',
    body: { name: 'RBAC', email: 'rbac@salalibre.local', password: 'Rbac123456', role: 'EMPLOYEE' },
  },
  { method: 'PATCH', path: `/users/${MISSING}`, body: { name: 'RBAC' } },
  { method: 'POST', path: `/users/${MISSING}/reset-password`, body: { newPassword: 'Rbac123456' } },
  { method: 'POST', path: '/closures', body: { date: nextBusinessDay(), reason: 'RBAC' } },
  { method: 'DELETE', path: `/closures/${MISSING}` },
];

/** Rutas de cualquier usuario autenticado. */
const AUTHENTICATED_ROUTES: Route[] = [
  { method: 'POST', path: '/auth/logout' },
  { method: 'GET', path: '/auth/me' },
  { method: 'PATCH', path: '/auth/password', body: { currentPassword: 'x', newPassword: 'Rbac123456' } },
  { method: 'GET', path: '/rooms' },
  { method: 'GET', path: `/bookings?date=${nextBusinessDay()}` },
  { method: 'GET', path: '/bookings/mine' },
  { method: 'POST', path: '/bookings', body: { roomId: MISSING, startAt: 'x', endAt: 'x', title: 'x', attendees: 1 } },
  { method: 'POST', path: `/bookings/${MISSING}/cancel` },
  { method: 'GET', path: '/closures' },
];

const label = (r: Route) => `${r.method} ${r.path.replace(MISSING, ':id').replace(/\?.*$/, '')}`;

describe('Integración · matriz de roles (RN-21, P-14)', () => {
  let api: IntegrationApp;
  let emp1: string;

  beforeAll(async () => {
    api = await IntegrationApp.start();
    emp1 = await api.login(SEED.emp1.email, SEED.emp1.password);
  });

  afterAll(async () => {
    await api.reset();
    await api.close();
  });

  it.each(ADMIN_ROUTES.map((r) => [label(r), r] as const))('RN-21 · EMPLOYEE en %s → 403 FORBIDDEN', async (_, r) => {
    const res = await api.request(r.method, r.path, { cookie: emp1, body: r.body });
    expect(res.status).toBe(403);
    expect((await body(res)).error.code).toBe('FORBIDDEN');
  });

  it.each([...ADMIN_ROUTES, ...AUTHENTICATED_ROUTES].map((r) => [label(r), r] as const))(
    'RN-21 · sin cookie en %s → 401 UNAUTHENTICATED',
    async (_, r) => {
      const res = await api.request(r.method, r.path, { body: r.body });
      expect(res.status).toBe(401);
      expect((await body(res)).error.code).toBe('UNAUTHENTICATED');
    },
  );

  it('RN-21 · con una cookie inválida o alterada → 401 UNAUTHENTICATED', async () => {
    const tampered = `${emp1.slice(0, -4)}AAAA`;
    for (const cookie of ['access_token=no-es-un-jwt', tampered]) {
      const res = await api.request('GET', '/auth/me', { cookie });
      expect(res.status).toBe(401);
    }
  });

  it('RN-21 · solo POST /auth/login y GET /health son públicas', async () => {
    expect((await api.request('GET', '/health')).status).toBe(200);
    const login = await api.request('POST', '/auth/login', { body: { email: SEED.emp1.email, password: 'incorrecta' } });
    expect(login.status).toBe(401);
    expect((await body(login)).error.code).toBe('INVALID_CREDENTIALS'); // llega al servicio: no la frena el guard
  });

  it('RN-21 · el ADMIN pasa el guard de rol en las rutas de ADMIN (no recibe 403)', async () => {
    const admin = await api.login(SEED.admin.email, SEED.admin.password);
    const res = await api.request('PATCH', `/rooms/${MISSING}`, { cookie: admin, body: { capacity: 5 } });
    expect(res.status).toBe(404);
    expect((await api.request('GET', '/users', { cookie: admin })).status).toBe(200);
  });

  // `POST /audit-logs/search` aún no existe: la crea T06a, que debe agregarla a ADMIN_ROUTES (403 y 401).
  it.todo('RN-21 · POST /audit-logs/search → 403 para EMPLOYEE y 401 sin cookie (T06a)');
});
