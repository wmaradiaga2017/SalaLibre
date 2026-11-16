import { addDays } from '../../src/common/time/zoned-time';
import { IntegrationApp, SEED, at, body, nextBusinessDay, today, type BookingBody, type RoomBody } from './support/int-app';

interface ClosureBody {
  id: string;
  date: string;
  reason: string;
  cancelledBookings?: number;
}

// T06 · P-11 (RN-16, RN-24) y carrera R-01 (lock por fecha, spec §11) contra PostgreSQL real.
describe('Integración · cierres (RN-16, RN-24)', () => {
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

  const close = (date: string) => api.request('POST', '/closures', { cookie: admin, body: { date, reason: 'Cierre de prueba' } });
  const dayRange = (date: string) => ({ from: new Date(at(date, '00:00')), to: new Date(at(addDays(date, 1), '00:00')) });

  it('RN-16 · P-11 · crear un cierre cancela las reservas CONFIRMED de ese día en todas las salas', async () => {
    const a = await body<BookingBody>(await api.book(emp1, roomA.id, day, '09:00', '10:00'));
    const b = await body<BookingBody>(await api.book(emp2, roomB.id, day, '15:00', '16:00'));
    const otherDay = await body<BookingBody>(await api.book(emp1, roomA.id, nextBusinessDay(1), '09:00', '10:00'));

    const res = await close(day);
    expect(res.status).toBe(201);
    expect(await body<ClosureBody>(res)).toMatchObject({ date: day, cancelledBookings: 2 });

    const rows = await api.prisma.booking.findMany({ where: { id: { in: [a.id, b.id, otherDay.id] } } });
    const status = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    expect(status).toEqual({ [a.id]: 'CANCELLED', [b.id]: 'CANCELLED', [otherDay.id]: 'CONFIRMED' });
    expect(await api.confirmedIn(dayRange(day))).toBe(0);
  });

  it('RN-24 · P-11 · repetir el cierre de la misma fecha → 409 CLOSURE_EXISTS', async () => {
    expect((await close(day)).status).toBe(201);
    const again = await close(day);
    expect(again.status).toBe(409);
    expect((await body(again)).error.code).toBe('CLOSURE_EXISTS');
  });

  it('RN-24 · P-11 · crear un cierre para hoy → 422 CLOSURE_IN_PAST', async () => {
    const res = await close(today());
    expect(res.status).toBe(422);
    expect((await body(res)).error.code).toBe('CLOSURE_IN_PAST');
  });

  it('RN-24 · P-11 · eliminar un cierre de hoy o pasado → 422 CLOSURE_IN_PAST; uno futuro → 204', async () => {
    // La API no deja crear cierres de hoy ni pasados: se insertan directamente en la base de pruebas.
    const admin_ = await api.prisma.user.findUniqueOrThrow({ where: { email: SEED.admin.email } });
    const insert = (date: string) =>
      api.prisma.closure.create({
        data: { date: new Date(`${date}T00:00:00.000Z`), reason: 'Directo', createdById: admin_.id },
      });
    const ofToday = await insert(today());
    const past = await insert(addDays(today(), -1));

    for (const id of [ofToday.id, past.id]) {
      const res = await api.request('DELETE', `/closures/${id}`, { cookie: admin });
      expect(res.status).toBe(422);
      expect((await body(res)).error.code).toBe('CLOSURE_IN_PAST');
    }

    const future = await body<ClosureBody>(await close(day));
    expect((await api.request('DELETE', `/closures/${future.id}`, { cookie: admin })).status).toBe(204);
    expect(await api.prisma.closure.count({ where: { id: future.id } })).toBe(0);
  });

  it('RN-16 · R-01 · un cierre en paralelo a 10 reservas de esa fecha no deja ninguna CONFIRMED ese día', async () => {
    const slots = Array.from({ length: 10 }, (_, i) => {
      const h = String(8 + i).padStart(2, '0');
      return [`${h}:00`, `${h}:30`] as const;
    });

    const [bookings, closure] = await Promise.all([
      Promise.all(slots.map(([s, e], i) => api.book(i % 2 ? emp1 : emp2, i % 2 ? roomA.id : roomB.id, day, s, e))),
      // Se lanza a mitad de la ráfaga para que compita con las reservas por el lock `date:<AAAA-MM-DD>`.
      new Promise<Response>((resolve) => setImmediate(() => resolve(close(day)))),
    ]);

    expect(closure.status).toBe(201);
    const created = bookings.filter((r) => r.status === 201).length;
    for (const r of bookings.filter((r) => r.status !== 201)) {
      expect(r.status).toBe(422);
      expect((await body(r)).error.code).toBe('DAY_CLOSED');
    }
    expect((await body<ClosureBody>(closure)).cancelledBookings).toBe(created);
    expect(await api.confirmedIn(dayRange(day))).toBe(0);
  });
});
