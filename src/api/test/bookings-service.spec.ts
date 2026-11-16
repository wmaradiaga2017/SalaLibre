import { loadBusinessConfig } from '../src/common/config/business-config';
import { AppError } from '../src/common/errors/app-error';
import type { TransactionContext, TransactionRunner } from '../src/common/transaction/transaction-runner';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import type { BookingRecord, NewBooking } from '../src/modules/bookings/domain/booking';
import type { BookingsRepository } from '../src/modules/bookings/domain/bookings.repository';
import type { RoomsService } from '../src/modules/rooms/rooms.service';
import type { UsersService } from '../src/modules/users/users.service';

/** Pruebas unitarias del service con dobles: registran el orden de cada paso dentro y fuera de la transacción. */

const NOW = new Date('2026-11-16T16:00:00Z'); // lunes 10:00 en Tegucigalpa
const ROOM = { id: 'room-1', name: 'Sala Copán', capacity: 8, location: 'Piso 1', equipment: [], isActive: true };
const EMPLOYEE = { id: 'user-1', role: 'EMPLOYEE' as const };
const VALID = {
  roomId: ROOM.id,
  startAt: new Date('2026-11-17T16:00:00Z'), // martes 10:00 local
  endAt: new Date('2026-11-17T17:00:00Z'),
  title: 'Demo',
  attendees: 2,
};

function setup(options: { closed?: boolean; userActive?: boolean; cancelReturnsNull?: boolean } = {}) {
  const events: string[] = [];
  let inTx = false;

  const ctx: TransactionContext = {
    advisoryLock: async (key) => {
      events.push(`lock ${key}${inTx ? '' : ' (FUERA de la transacción)'}`);
    },
  };
  const tx: TransactionRunner = {
    run: async (work) => {
      events.push('begin');
      inTx = true;
      try {
        return await work(ctx);
      } finally {
        inTx = false;
        events.push('end');
      }
    },
  };
  const record = (b: NewBooking): BookingRecord => ({
    id: 'booking-1',
    ...b,
    roomName: ROOM.name,
    ownerName: 'Empleado Uno',
    status: 'CONFIRMED',
    cancelledAt: null,
    cancelledById: null,
    cancelledByName: null,
  });
  const repo: BookingsRepository = {
    findById: async () => {
      events.push('findById');
      return record({ ...VALID, userId: EMPLOYEE.id });
    },
    listConfirmedStartingBetween: async () => [],
    listByUserEndingFrom: async () => [],
    isDateClosed: async (c, date) => {
      events.push(`isDateClosed ${date}${c === ctx ? '' : ' (sin ctx)'}`);
      return options.closed ?? false;
    },
    create: async (c, b) => {
      events.push(`create${c === ctx ? '' : ' (sin ctx)'}`);
      return record(b);
    },
    cancel: async () => {
      events.push('cancel');
      return options.cancelReturnsNull ? null : { ...record({ ...VALID, userId: EMPLOYEE.id }), status: 'CANCELLED' };
    },
    cancelFutureByUser: async () => [],
    cancelConfirmedBetween: async () => [],
  };
  const rooms = {
    findById: async (id: string) => {
      events.push('room');
      return id === ROOM.id ? ROOM : null;
    },
  } as unknown as RoomsService;
  const users = {
    findById: async (_id: string, c?: TransactionContext) => {
      events.push(c === ctx ? 'user' : 'user (FUERA de la transacción)');
      return { id: EMPLOYEE.id, isActive: options.userActive ?? true };
    },
  } as unknown as UsersService;

  const service = new BookingsService(repo, tx, loadBusinessConfig({}), { now: () => NOW }, rooms, users);
  return { service, events };
}

async function codeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    if (error instanceof AppError) {
      return error.code;
    }
    throw error;
  }
}

describe('BookingsService (T05, unitarias)', () => {
  it('spec §11 · al crear toma pg_advisory_xact_lock sobre la fecha local y el userId dentro de la misma transacción, antes del INSERT', async () => {
    const { service, events } = setup();

    await service.create(EMPLOYEE, VALID);

    expect(events).toEqual([
      'room',
      'begin',
      'lock date:2026-11-17',
      'lock user:user-1',
      'user',
      'isDateClosed 2026-11-17',
      'create',
      'end',
    ]);
  });

  it('RN-10 · día cerrado → DAY_CLOSED dentro de la transacción, con los locks tomados y sin INSERT', async () => {
    const { service, events } = setup({ closed: true });

    expect(await codeOf(service.create(EMPLOYEE, VALID))).toBe('DAY_CLOSED');
    expect(events).toEqual(['room', 'begin', 'lock date:2026-11-17', 'lock user:user-1', 'user', 'isDateClosed 2026-11-17', 'end']);
  });

  it('RN-14 · si el usuario quedó inactivo antes de tomar el lock → UNAUTHENTICATED y sin INSERT', async () => {
    const { service, events } = setup({ userActive: false });

    expect(await codeOf(service.create(EMPLOYEE, VALID))).toBe('UNAUTHENTICATED');
    expect(events).not.toContain('create');
  });

  it('D-32 · sala inexistente → NOT_FOUND antes que cualquier regla y sin abrir transacción', async () => {
    const { service, events } = setup();
    const bad = { ...VALID, roomId: 'no-existe', startAt: new Date('2026-11-21T16:10:00Z') };

    expect(await codeOf(service.create(EMPLOYEE, bad))).toBe('NOT_FOUND');
    expect(events).toEqual(['room']);
  });

  it('D-32 · las reglas de tiempo y de sala fallan antes de abrir la transacción (sin locks)', async () => {
    const { service, events } = setup();

    expect(await codeOf(service.create(EMPLOYEE, { ...VALID, attendees: 9 }))).toBe('CAPACITY_EXCEEDED');
    expect(await codeOf(service.create(EMPLOYEE, { ...VALID, startAt: new Date('2026-11-17T16:10:00Z') }))).toBe(
      'INVALID_SLOT',
    );
    expect(events.some((e) => e.startsWith('lock') || e === 'begin')).toBe(false);
  });

  it('RN-12 · si otra petición canceló la reserva entre la lectura y el UPDATE → BOOKING_ALREADY_CANCELLED', async () => {
    const { service, events } = setup({ cancelReturnsNull: true });

    expect(await codeOf(service.cancel(EMPLOYEE, 'booking-1'))).toBe('BOOKING_ALREADY_CANCELLED');
    expect(events).toEqual(['findById', 'begin', 'cancel', 'end']);
  });
});
