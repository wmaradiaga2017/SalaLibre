import { IntegrationApp, SEED, at, body, nextBusinessDay, statusCount, type BookingBody, type RoomBody } from './support/int-app';

// T06 · P-01 a P-04: el riesgo central (RN-01) contra PostgreSQL real; lo garantiza `bookings_no_overlap` (D-04).
describe('Integración · choques de reserva (RN-01)', () => {
  let api: IntegrationApp;
  let admin: string;
  let emp1: string;
  let emp2: string;
  let roomA: RoomBody;
  let roomB: RoomBody;
  const day = nextBusinessDay();

  beforeAll(async () => {
    api = await IntegrationApp.start();
    admin = await api.login(SEED.admin.email, SEED.admin.password);
    emp1 = await api.login(SEED.emp1.email, SEED.emp1.password);
    emp2 = await api.login(SEED.emp2.email, SEED.emp2.password);
    roomA = await api.createRoom(admin, 10);
    roomB = await api.createRoom(admin, 10);
  });

  beforeEach(() => api.reset());

  afterAll(async () => {
    await api.reset();
    await api.close();
  });

  it('RN-01 · P-01 · 20 POST /bookings simultáneos al mismo hueco y sala: 1 × 201 y 19 × 409 BOOKING_CONFLICT', async () => {
    const cookies = [emp1, emp2, admin];
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) => api.book(cookies[i % cookies.length], roomA.id, day, '10:00', '11:00')),
    );

    expect(statusCount(responses)).toEqual({ 201: 1, 409: 19 });
    const conflicts = await Promise.all(responses.filter((r) => r.status === 409).map((r) => body(r)));
    expect(new Set(conflicts.map((e) => e.error.code))).toEqual(new Set(['BOOKING_CONFLICT']));
    expect(
      await api.confirmedIn({ roomId: roomA.id, from: new Date(at(day, '10:00')), to: new Date(at(day, '11:00')) }),
    ).toBe(1);
  });

  it('RN-01 · P-01 · el pool atiende 20 peticiones simultáneas a huecos distintos sin errores 500', async () => {
    const slots = Array.from({ length: 20 }, (_, i) => {
      const start = 7 * 60 + i * 30; // 07:00, 07:30, … 16:30
      const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      return [hhmm(start), hhmm(start + 30)] as const;
    });
    const responses = await Promise.all(slots.map(([s, e]) => api.book(emp1, roomA.id, day, s, e)));

    expect(statusCount(responses)).toEqual({ 201: 20 });
    expect(await api.confirmedIn({ roomId: roomA.id, from: new Date(at(day, '00:00')) })).toBe(20);
  });

  it('RN-01 · P-02 · reservas contiguas (10:00–11:00 y 11:00–12:00) se aceptan', async () => {
    expect((await api.book(emp1, roomA.id, day, '10:00', '11:00')).status).toBe(201);
    expect((await api.book(emp2, roomA.id, day, '11:00', '12:00')).status).toBe(201);
    expect((await api.book(emp2, roomA.id, day, '09:00', '10:00')).status).toBe(201);
  });

  it('RN-01 · P-03 · una reserva CANCELLED no bloquea el hueco', async () => {
    const first = await body<BookingBody>(await api.book(emp1, roomA.id, day, '10:00', '11:00'));
    expect((await api.cancel(emp1, first.id)).status).toBe(200);

    const again = await api.book(emp2, roomA.id, day, '10:00', '11:00');
    expect(again.status).toBe(201);
    expect(await api.prisma.booking.count({ where: { roomId: roomA.id } })).toBe(2);
  });

  it('RN-01 · P-04 · solape parcial en la misma sala → 409; mismo horario en otra sala → 201', async () => {
    expect((await api.book(emp1, roomA.id, day, '10:00', '11:00')).status).toBe(201);

    const partial = await api.book(emp2, roomA.id, day, '10:30', '11:30');
    expect(partial.status).toBe(409);
    expect((await body(partial)).error.code).toBe('BOOKING_CONFLICT');

    const inside = await api.book(emp2, roomA.id, day, '10:15', '10:45');
    expect(inside.status).toBe(409);

    expect((await api.book(emp2, roomB.id, day, '10:00', '11:00')).status).toBe(201);
  });
});
