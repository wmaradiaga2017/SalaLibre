import { IntegrationApp, SEED, body, nextBusinessDay, type BookingBody, type RoomBody } from './support/int-app';

// T06 · P-10 (RN-14, RN-15) y carrera R-02 (lock por `userId`, spec §11) contra PostgreSQL real.
describe('Integración · desactivar usuario (RN-14, RN-15)', () => {
  let api: IntegrationApp;
  let admin: string;
  let room: RoomBody;
  const day = nextBusinessDay();

  beforeAll(async () => {
    api = await IntegrationApp.start();
    admin = await api.login(SEED.admin.email, SEED.admin.password);
    room = await api.createRoom(admin, 10);
  });

  beforeEach(() => api.reset());

  afterAll(async () => {
    await api.reset();
    await api.close();
  });

  const deactivate = (id: string) => api.request('PATCH', `/users/${id}`, { cookie: admin, body: { isActive: false } });

  it('RN-15 · P-10 · desactivar cancela sus reservas futuras en la misma operación', async () => {
    const user = await api.createUser(admin);
    const a = await body<BookingBody>(await api.book(user.cookie, room.id, day, '09:00', '10:00'));
    const b = await body<BookingBody>(await api.book(user.cookie, room.id, nextBusinessDay(1), '09:00', '10:00'));
    const other = await body<BookingBody>(
      await api.book(await api.login(SEED.emp1.email, SEED.emp1.password), room.id, day, '11:00', '12:00'),
    );

    const res = await deactivate(user.id);
    expect(res.status).toBe(200);
    expect(await body(res)).toMatchObject({ isActive: false });

    const rows = await api.prisma.booking.findMany({ where: { id: { in: [a.id, b.id, other.id] } } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(a.id)).toMatchObject({ status: 'CANCELLED' });
    expect(byId.get(b.id)).toMatchObject({ status: 'CANCELLED' });
    expect(byId.get(a.id)?.cancelledById).not.toBeNull();
    expect(byId.get(other.id)).toMatchObject({ status: 'CONFIRMED' }); // solo las del usuario desactivado
  });

  it('RN-14 · P-10 · la cookie vigente del usuario desactivado pasa a 401 y ya no puede iniciar sesión', async () => {
    const user = await api.createUser(admin);
    expect((await api.request('GET', '/auth/me', { cookie: user.cookie })).status).toBe(200);

    expect((await deactivate(user.id)).status).toBe(200);

    const me = await api.request('GET', '/auth/me', { cookie: user.cookie });
    expect(me.status).toBe(401);
    expect((await body(me)).error.code).toBe('UNAUTHENTICATED');
    const book = await api.book(user.cookie, room.id, day, '13:00', '14:00');
    expect(book.status).toBe(401);
    const login = await api.request('POST', '/auth/login', { body: { email: user.email, password: 'Integracion123' } });
    expect(login.status).toBe(401);
    expect((await body(login)).error.code).toBe('INVALID_CREDENTIALS');
  });

  it('RN-15 · R-02 · desactivar en paralelo a 10 reservas del mismo usuario no deja ninguna CONFIRMED futura', async () => {
    const user = await api.createUser(admin);
    const slots = Array.from({ length: 10 }, (_, i) => {
      const h = String(8 + i).padStart(2, '0');
      return [`${h}:00`, `${h}:30`] as const;
    });

    const [bookings, deactivation] = await Promise.all([
      Promise.all(slots.map(([s, e]) => api.book(user.cookie, room.id, day, s, e))),
      // Se lanza a mitad de la ráfaga para que compita con las reservas por el lock `user:<uuid>`.
      new Promise<Response>((resolve) => setImmediate(() => resolve(deactivate(user.id)))),
    ]);

    expect(deactivation.status).toBe(200);
    for (const r of bookings) {
      expect([201, 401]).toContain(r.status);
    }
    expect(await api.confirmedIn({ userId: user.id, from: new Date() })).toBe(0);
    // Toda reserva que llegó a crearse quedó cancelada por la cascada.
    const created = bookings.filter((r) => r.status === 201).length;
    expect(await api.prisma.booking.count({ where: { userId: user.id, status: 'CANCELLED' } })).toBe(created);
  });
});
