import { loadBusinessConfig } from '../src/common/config/business-config';
import { AppError } from '../src/common/errors/app-error';
import { addDays, isCalendarDate, localDate, startOfLocalDay, toLocal } from '../src/common/time/zoned-time';
import { toBookingView, type BookingRecord } from '../src/modules/bookings/domain/booking';
import { assertRoomRules, assertTimeRules, bookingDate } from '../src/modules/bookings/domain/booking-rules';
import { assertCanCancel } from '../src/modules/bookings/domain/booking.policy';

const config = loadBusinessConfig({}); // valores por defecto del spec §5 (America/Tegucigalpa, UTC-6 sin horario de verano)

// "Ahora": lunes 2026-11-16 10:00 en Tegucigalpa (16:00Z).
const NOW = new Date('2026-11-16T16:00:00Z');

/** Hora local de Tegucigalpa → instante (UTC-6). */
const local = (dateTime: string) => new Date(`${dateTime}:00-06:00`);

function codeOf(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (error) {
    if (error instanceof AppError) {
      return error.code;
    }
    throw error;
  }
}

const time = (start: string, end: string, now = NOW) => codeOf(() => assertTimeRules({ startAt: local(start), endAt: local(end) }, now, config));

describe('Zona horaria y configuración (spec §5, D-07, D-21)', () => {
  it('D-21 · toLocal convierte un instante UTC a la hora de America/Tegucigalpa', () => {
    const l = toLocal(new Date('2026-11-17T05:30:00Z'), 'America/Tegucigalpa');

    expect(l).toMatchObject({ date: '2026-11-16', hour: 23, minute: 30, weekday: 1, minutesOfDay: 23 * 60 + 30 });
    expect(localDate(new Date('2026-11-17T06:00:00Z'), 'America/Tegucigalpa')).toBe('2026-11-17');
  });

  it('D-07 · startOfLocalDay da el instante UTC de las 00:00 locales, también en zonas con horario de verano', () => {
    expect(startOfLocalDay('2026-11-16', 'America/Tegucigalpa').toISOString()).toBe('2026-11-16T06:00:00.000Z');
    expect(startOfLocalDay('2026-07-01', 'America/New_York').toISOString()).toBe('2026-07-01T04:00:00.000Z');
    expect(startOfLocalDay('2026-01-15', 'America/New_York').toISOString()).toBe('2026-01-15T05:00:00.000Z');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect([isCalendarDate('2026-02-29'), isCalendarDate('2028-02-29'), isCalendarDate('2026-1-01')]).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('spec §5 · la configuración usa los valores del spec por defecto y rechaza valores inválidos al arrancar', () => {
    expect(config).toEqual({
      timeZone: 'America/Tegucigalpa',
      openMinutes: 420,
      closeMinutes: 1200,
      slotMinutes: 15,
      minMinutes: 15,
      maxMinutes: 240,
      maxDaysAhead: 30,
    });
    expect(() => loadBusinessConfig({ BUSINESS_TZ: 'Marte/Olympus' })).toThrow(/BUSINESS_TZ/);
    expect(() => loadBusinessConfig({ BUSINESS_OPEN_TIME: '7am' })).toThrow(/BUSINESS_OPEN_TIME/);
    expect(() => loadBusinessConfig({ BOOKING_MAX_DAYS_AHEAD: '0' })).toThrow(/BOOKING_MAX_DAYS_AHEAD/);
    expect(() => loadBusinessConfig({ BUSINESS_OPEN_TIME: '20:00', BUSINESS_CLOSE_TIME: '07:00' })).toThrow();
  });
});

describe('Reglas de tiempo de las reservas (P-05, P-06, P-07)', () => {
  it('RN-02 · inicio o fin fuera de un bloque de 15 min, con segundos o milisegundos → INVALID_SLOT', () => {
    expect(time('2026-11-17T10:10', '2026-11-17T11:00')).toBe('INVALID_SLOT');
    expect(time('2026-11-17T10:00', '2026-11-17T11:05')).toBe('INVALID_SLOT');
    const withSeconds = { startAt: new Date('2026-11-17T16:00:30Z'), endAt: new Date('2026-11-17T17:00:00Z') };
    const withMs = { startAt: new Date('2026-11-17T16:00:00.500Z'), endAt: new Date('2026-11-17T17:00:00Z') };
    expect(codeOf(() => assertTimeRules(withSeconds, NOW, config))).toBe('INVALID_SLOT');
    expect(codeOf(() => assertTimeRules(withMs, NOW, config))).toBe('INVALID_SLOT');
    expect(time('2026-11-17T10:15', '2026-11-17T10:45')).toBeNull();
  });

  it('RN-03 · duración 0, negativa, 14 o 241 min → INVALID_DURATION; 15 y 240 min → válida', () => {
    expect(time('2026-11-17T10:00', '2026-11-17T10:00')).toBe('INVALID_DURATION');
    expect(time('2026-11-17T11:00', '2026-11-17T10:00')).toBe('INVALID_DURATION');
    // 14 y 241 minutos no son múltiplos de 15: se prueban con un bloque de 1 minuto para aislar RN-03.
    const oneMinute = { ...config, slotMinutes: 1 };
    const d = (start: string, end: string) =>
      codeOf(() => assertTimeRules({ startAt: local(start), endAt: local(end) }, NOW, oneMinute));
    expect(d('2026-11-17T10:00', '2026-11-17T10:14')).toBe('INVALID_DURATION');
    expect(d('2026-11-17T10:00', '2026-11-17T14:01')).toBe('INVALID_DURATION');
    expect(time('2026-11-17T10:00', '2026-11-17T10:15')).toBeNull();
    expect(time('2026-11-17T10:00', '2026-11-17T14:00')).toBeNull();
    expect(time('2026-11-17T10:00', '2026-11-17T14:15')).toBe('INVALID_DURATION');
  });

  it('RN-04 · sábado, domingo, 06:45, fin 20:15 o cruce de medianoche → OUTSIDE_BUSINESS_HOURS; lunes 07:00–20:00 bloque a bloque → válido', () => {
    expect(time('2026-11-21T10:00', '2026-11-21T11:00')).toBe('OUTSIDE_BUSINESS_HOURS'); // sábado
    expect(time('2026-11-22T10:00', '2026-11-22T11:00')).toBe('OUTSIDE_BUSINESS_HOURS'); // domingo
    expect(time('2026-11-17T06:45', '2026-11-17T07:45')).toBe('OUTSIDE_BUSINESS_HOURS');
    expect(time('2026-11-17T19:15', '2026-11-17T20:15')).toBe('OUTSIDE_BUSINESS_HOURS');
    expect(time('2026-11-17T23:00', '2026-11-18T01:00')).toBe('OUTSIDE_BUSINESS_HOURS'); // cruza medianoche
    expect(time('2026-11-23T07:00', '2026-11-23T08:00')).toBeNull(); // lunes 07:00
    expect(time('2026-11-23T19:00', '2026-11-23T20:00')).toBeNull(); // lunes hasta 20:00
    // Se evalúa en Tegucigalpa, no en UTC: viernes 19:00 local es sábado 01:00Z y es válido.
    expect(time('2026-11-20T19:00', '2026-11-20T20:00')).toBeNull();
  });

  it('RN-05 · inicio igual o anterior a ahora → BOOKING_IN_PAST', () => {
    expect(time('2026-11-16T10:00', '2026-11-16T11:00')).toBe('BOOKING_IN_PAST'); // justo ahora
    expect(time('2026-11-16T09:00', '2026-11-16T10:00')).toBe('BOOKING_IN_PAST');
    expect(time('2026-11-16T10:15', '2026-11-16T11:00')).toBeNull();
  });

  it('RN-06 · más de 30 días → TOO_FAR_AHEAD; justo 30 días → válido', () => {
    expect(time('2026-12-16T10:00', '2026-12-16T11:00')).toBeNull(); // ahora + 30 días exactos
    expect(time('2026-12-16T10:15', '2026-12-16T11:00')).toBe('TOO_FAR_AHEAD');
  });

  it('RN-07 · RN-09 · sala inactiva → ROOM_INACTIVE antes que CAPACITY_EXCEEDED; asistentes = capacidad → válido', () => {
    expect(codeOf(() => assertRoomRules({ isActive: false, capacity: 2 }, 5))).toBe('ROOM_INACTIVE');
    expect(codeOf(() => assertRoomRules({ isActive: true, capacity: 4 }, 5))).toBe('CAPACITY_EXCEEDED');
    expect(codeOf(() => assertRoomRules({ isActive: true, capacity: 4 }, 4))).toBeNull();
  });

  it('D-32 · varias reglas incumplidas a la vez (sábado a las 10:10) → el primer error del orden: INVALID_SLOT', () => {
    expect(time('2026-11-21T10:10', '2026-11-21T11:00')).toBe('INVALID_SLOT');
    // sábado, fuera de bloque y en el pasado: también INVALID_SLOT
    expect(time('2026-11-14T10:10', '2026-11-14T11:00')).toBe('INVALID_SLOT');
    // duración inválida y en sábado: INVALID_DURATION antes que OUTSIDE_BUSINESS_HOURS
    expect(time('2026-11-21T10:00', '2026-11-21T15:00')).toBe('INVALID_DURATION');
    // fuera de horario y en el pasado: OUTSIDE_BUSINESS_HOURS antes que BOOKING_IN_PAST
    expect(time('2026-11-14T10:00', '2026-11-14T11:00')).toBe('OUTSIDE_BUSINESS_HOURS');
  });

  it('spec §11 · la fecha que se bloquea y se compara con closures es la fecha local del inicio', () => {
    expect(bookingDate(local('2026-11-20T19:00'), config)).toBe('2026-11-20'); // 01:00Z del sábado
  });
});

describe('BookingPolicy (P-09, RN-11, RN-12)', () => {
  const OWNER = { id: 'owner', role: 'EMPLOYEE' as const };
  const OTHER = { id: 'other', role: 'EMPLOYEE' as const };
  const ADMIN = { id: 'admin', role: 'ADMIN' as const };
  const future: Pick<BookingRecord, 'userId' | 'status' | 'startAt'> = {
    userId: 'owner',
    status: 'CONFIRMED',
    startAt: local('2026-11-17T10:00'),
  };
  const can = (viewer: typeof OWNER | typeof ADMIN, booking = future) =>
    codeOf(() => assertCanCancel(viewer, booking, NOW));

  it('RN-11 · el dueño cancela su reserva futura; otro EMPLOYEE → FORBIDDEN; un ADMIN → permitido', () => {
    expect(can(OWNER)).toBeNull();
    expect(can(OTHER)).toBe('FORBIDDEN');
    expect(can(ADMIN)).toBeNull();
  });

  it('RN-12 · ya empezada (inicio igual o anterior a ahora) → BOOKING_ALREADY_STARTED; ya cancelada → BOOKING_ALREADY_CANCELLED', () => {
    expect(can(OWNER, { ...future, startAt: NOW })).toBe('BOOKING_ALREADY_STARTED');
    expect(can(OWNER, { ...future, startAt: local('2026-11-16T09:00') })).toBe('BOOKING_ALREADY_STARTED');
    expect(can(OWNER, { ...future, status: 'CANCELLED' })).toBe('BOOKING_ALREADY_CANCELLED');
  });

  it('D-32 · cancelada y ya empezada → BOOKING_ALREADY_CANCELLED; ajena, cancelada y empezada → FORBIDDEN', () => {
    const cancelledPast = { ...future, status: 'CANCELLED' as const, startAt: local('2026-11-16T08:00') };
    expect(can(OWNER, cancelledPast)).toBe('BOOKING_ALREADY_CANCELLED');
    expect(can(OTHER, cancelledPast)).toBe('FORBIDDEN');
  });
});

describe('Vista de la reserva (RN-17)', () => {
  const record: BookingRecord = {
    id: 'b1',
    roomId: 'r1',
    roomName: 'Sala Copán',
    userId: 'owner',
    ownerName: 'Empleado Uno',
    title: 'Planificación',
    attendees: 3,
    startAt: new Date('2026-11-17T16:00:00Z'),
    endAt: new Date('2026-11-17T17:00:00Z'),
    status: 'CANCELLED',
    cancelledAt: new Date('2026-11-16T16:00:00Z'),
    cancelledById: 'admin',
    cancelledByName: 'Administrador RRHH',
  };

  it('RN-17 · un EMPLOYEE ve title null en ajenas y el título en las suyas; un ADMIN siempre ve el título', () => {
    expect(toBookingView(record, { id: 'other', role: 'EMPLOYEE' }).title).toBeNull();
    expect(toBookingView(record, { id: 'owner', role: 'EMPLOYEE' })).toMatchObject({ title: 'Planificación', isMine: true });
    expect(toBookingView(record, { id: 'admin', role: 'ADMIN' })).toMatchObject({ title: 'Planificación', isMine: false });
  });

  it('RN-13 · la vista trae el objeto Booking de spec §8 con cancelledAt y cancelledBy', () => {
    expect(toBookingView(record, { id: 'owner', role: 'EMPLOYEE' })).toEqual({
      id: 'b1',
      roomId: 'r1',
      roomName: 'Sala Copán',
      owner: { id: 'owner', name: 'Empleado Uno' },
      title: 'Planificación',
      attendees: 3,
      startAt: '2026-11-17T16:00:00.000Z',
      endAt: '2026-11-17T17:00:00.000Z',
      status: 'CANCELLED',
      cancelledAt: '2026-11-16T16:00:00.000Z',
      cancelledBy: { id: 'admin', name: 'Administrador RRHH' },
      isMine: true,
    });
  });
});
