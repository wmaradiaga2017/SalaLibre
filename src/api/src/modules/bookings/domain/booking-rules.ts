// Reglas de creación de reservas (RN-02 a RN-07, RN-09). Funciones puras: sin Nest, Prisma ni HTTP.
// El orden de evaluación es el de spec §8 «Orden de validación» (D-32).
import type { BusinessConfig } from '../../../common/config/business-config';
import { AppError } from '../../../common/errors/app-error';
import { toLocal } from '../../../common/time/zoned-time';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export interface BookingTime {
  startAt: Date;
  endAt: Date;
}

export interface RoomForBooking {
  isActive: boolean;
  capacity: number;
}

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** RN-02: minuto múltiplo de `slotMinutes` (en la hora local), con segundos y milisegundos en 0. */
function isOnSlot(instant: Date, config: BusinessConfig): boolean {
  const local = toLocal(instant, config.timeZone);
  return local.second === 0 && instant.getUTCMilliseconds() === 0 && local.minute % config.slotMinutes === 0;
}

/**
 * Reglas de tiempo, sin consultar la base, en este orden:
 * `INVALID_SLOT` (RN-02) → `INVALID_DURATION` (RN-03) → `OUTSIDE_BUSINESS_HOURS` (RN-04) → `BOOKING_IN_PAST` (RN-05)
 * → `TOO_FAR_AHEAD` (RN-06). Todas las horas se interpretan en `config.timeZone`.
 */
export function assertTimeRules(booking: BookingTime, now: Date, config: BusinessConfig): void {
  const { startAt, endAt } = booking;

  if (!isOnSlot(startAt, config) || !isOnSlot(endAt, config)) {
    throw new AppError(
      'INVALID_SLOT',
      `El inicio y el fin deben caer en bloques de ${config.slotMinutes} minutos (p. ej. 10:00, 10:15).`,
    );
  }

  const minutes = (endAt.getTime() - startAt.getTime()) / MINUTE;
  if (minutes < config.minMinutes || minutes > config.maxMinutes) {
    throw new AppError(
      'INVALID_DURATION',
      `La reserva debe durar entre ${config.minMinutes} y ${config.maxMinutes} minutos.`,
    );
  }

  const start = toLocal(startAt, config.timeZone);
  const end = toLocal(endAt, config.timeZone);
  const weekday = start.weekday >= 1 && start.weekday <= 5;
  const sameDay = start.date === end.date;
  if (!weekday || !sameDay || start.minutesOfDay < config.openMinutes || end.minutesOfDay > config.closeMinutes) {
    throw new AppError(
      'OUTSIDE_BUSINESS_HOURS',
      `Las reservas son de lunes a viernes, entre ${hhmm(config.openMinutes)} y ${hhmm(config.closeMinutes)}, el mismo día.`,
    );
  }

  if (startAt.getTime() <= now.getTime()) {
    throw new AppError('BOOKING_IN_PAST', 'La reserva debe empezar después del momento actual.');
  }

  if (startAt.getTime() > now.getTime() + config.maxDaysAhead * DAY) {
    throw new AppError('TOO_FAR_AHEAD', `Solo se puede reservar hasta ${config.maxDaysAhead} días por adelantado.`);
  }
}

/** Reglas de datos de la sala, después de las de tiempo: `ROOM_INACTIVE` (RN-09) → `CAPACITY_EXCEEDED` (RN-07). */
export function assertRoomRules(room: RoomForBooking, attendees: number): void {
  if (!room.isActive) {
    throw new AppError('ROOM_INACTIVE', 'La sala está desactivada y no admite reservas.');
  }
  if (attendees > room.capacity) {
    throw new AppError('CAPACITY_EXCEEDED', `La sala admite como máximo ${room.capacity} personas.`);
  }
}

/** Fecha local (`AAAA-MM-DD`) de la reserva: la que se bloquea (spec §11) y la que se compara con `closures` (RN-10). */
export function bookingDate(startAt: Date, config: BusinessConfig): string {
  return toLocal(startAt, config.timeZone).date;
}
