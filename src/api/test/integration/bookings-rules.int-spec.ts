import {
  IntegrationApp,
  SEED,
  body,
  nextBusinessDay,
  type BookingBody,
  type RoomBody,
  type UserBody,
} from './support/int-app';

// T06 · P-08 (RN-07, RN-09, RN-10), P-09 integración (RN-11, RN-12) y P-13 (RN-17) contra PostgreSQL real.
describe('Integración · reglas de reserva, cancelación y visibilidad', () => {
  let api: IntegrationApp;
  let admin: string;
  let emp1: string;
  let emp2: string;
  let emp1Id: string;
  let small: RoomBody;
  let room: RoomBody;
  let inactive: RoomBody;
  const day = nextBusinessDay();

  beforeAll(async () => {
    api = await IntegrationApp.start();
    admin = await api.login(SEED.admin.email, SEED.admin.password);
    emp1 = await api.login(SEED.emp1.email, SEED.emp1.password);
    emp2 = await api.login(SEED.emp2.email, SEED.emp2.password);
    emp1Id = (await body<UserBody>(await api.request('GET', '/auth/me', { cookie: emp1 }))).id;
    small = await api.createRoom(admin, 4);
    room = await api.createRoom(admin, 10);
    inactive = await api.createRoom(admin, 10);
    const off = await api.request('PATCH', `/rooms/${inactive.id}`, { cookie: admin, body: { isActive: false } });
    expect(off.status).toBe(200);
  });

  beforeEach(() => api.reset());

  afterAll(async () => {
    await api.reset();
    await api.close();
  });

  const expectError = async (res: Response, status: number, code: string) => {
    expect(res.status).toBe(status);
    expect((await body(res)).error.code).toBe(code);
  };

  describe('P-08 · errores 422 de datos', () => {
    it('RN-07 · asistentes por encima de la capacidad → 422 CAPACITY_EXCEEDED; igual a la capacidad → 201', async () => {
      await expectError(
        await api.book(emp1, small.id, day, '10:00', '11:00', { attendees: 5 }),
        422,
        'CAPACITY_EXCEEDED',
      );
      expect((await api.book(emp1, small.id, day, '10:00', '11:00', { attendees: 4 })).status).toBe(201);
    });

    it('RN-09 · sala inactiva → 422 ROOM_INACTIVE', async () => {
      await expectError(await api.book(emp1, inactive.id, day, '10:00', '11:00'), 422, 'ROOM_INACTIVE');
      expect(await api.prisma.booking.count({ where: { roomId: inactive.id } })).toBe(0);
    });

    it('RN-10 · día cerrado → 422 DAY_CLOSED', async () => {
      const closure = await api.request('POST', '/closures', { cookie: admin, body: { date: day, reason: 'Inventario' } });
      expect(closure.status).toBe(201);

      await expectError(await api.book(emp1, room.id, day, '10:00', '11:00'), 422, 'DAY_CLOSED');
      expect((await api.book(emp1, room.id, nextBusinessDay(1), '10:00', '11:00')).status).toBe(201);
    });
  });

  describe('P-09 · cancelar (BookingPolicy contra la base)', () => {
    let own: BookingBody;

    beforeEach(async () => {
      own = await body<BookingBody>(await api.book(emp1, room.id, day, '10:00', '11:00'));
    });

    it('RN-11 · el dueño cancela su reserva futura → 200 CANCELLED', async () => {
      const res = await api.cancel(emp1, own.id);
      expect(res.status).toBe(200);
      expect((await body<BookingBody>(res)).status).toBe('CANCELLED');
      const row = await api.prisma.booking.findUniqueOrThrow({ where: { id: own.id } });
      expect(row.status).toBe('CANCELLED');
      expect(row.cancelledAt).not.toBeNull();
      expect(row.cancelledById).toBe(emp1Id);
    });

    it('RN-11 · otro EMPLOYEE → 403 FORBIDDEN y la reserva sigue CONFIRMED', async () => {
      await expectError(await api.cancel(emp2, own.id), 403, 'FORBIDDEN');
      expect((await api.prisma.booking.findUniqueOrThrow({ where: { id: own.id } })).status).toBe('CONFIRMED');
    });

    it('RN-11 · un ADMIN cancela una reserva ajena → 200', async () => {
      const res = await api.cancel(admin, own.id);
      expect(res.status).toBe(200);
      expect((await body<BookingBody>(res)).status).toBe('CANCELLED');
    });

    it('RN-12 · reserva ya cancelada → 422 BOOKING_ALREADY_CANCELLED', async () => {
      expect((await api.cancel(emp1, own.id)).status).toBe(200);
      await expectError(await api.cancel(emp1, own.id), 422, 'BOOKING_ALREADY_CANCELLED');
    });

    it('RN-12 · reserva ya empezada → 422 BOOKING_ALREADY_STARTED (también para ADMIN)', async () => {
      // La API no deja crear reservas en el pasado (RN-05): se inserta directamente una que empezó hace 15 minutos.
      const now = Date.now();
      const started = await api.prisma.booking.create({
        data: {
          roomId: room.id,
          userId: emp1Id,
          title: 'En curso',
          attendees: 2,
          startAt: new Date(now - 15 * 60_000),
          endAt: new Date(now + 45 * 60_000),
        },
      });
      await expectError(await api.cancel(emp1, started.id), 422, 'BOOKING_ALREADY_STARTED');
      await expectError(await api.cancel(admin, started.id), 422, 'BOOKING_ALREADY_STARTED');
    });

    it('RN-11 · id inexistente → 404 NOT_FOUND', async () => {
      await expectError(await api.cancel(emp1, '00000000-0000-4000-8000-000000000000'), 404, 'NOT_FOUND');
    });
  });

  describe('P-13 · visibilidad del título', () => {
    it('RN-17 · EMPLOYEE recibe title: null en reservas ajenas; el dueño y el ADMIN reciben el título', async () => {
      const own = await body<BookingBody>(
        await api.book(emp1, room.id, day, '10:00', '11:00', { title: 'Plan confidencial' }),
      );
      const list = async (cookie: string) =>
        (await body<BookingBody[]>(await api.request('GET', `/bookings?date=${day}`, { cookie }))).find(
          (b) => b.id === own.id,
        );

      expect(await list(emp2)).toMatchObject({ title: null, isMine: false });
      expect(await list(emp1)).toMatchObject({ title: 'Plan confidencial', isMine: true });
      expect(await list(admin)).toMatchObject({ title: 'Plan confidencial', isMine: false });
    });
  });
});
