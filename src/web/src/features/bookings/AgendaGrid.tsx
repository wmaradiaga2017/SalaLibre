import { useMemo } from 'react';
import { formatMinutes, localMinutes, zonedInstant } from '../../shared/datetime';
import { Badge, cn } from '../../shared/ui';
import {
  CLOSE_MINUTES,
  GRID_HEIGHT_PX,
  OPEN_MINUTES,
  PX_PER_MINUTE,
  ROOM_COLUMN_MIN_PX,
  SLOT_MINUTES,
  SLOT_STARTS,
  TIME_AXIS_WIDTH_PX,
} from './agenda-config';
import { bookingMinutes, bookingsByRoom, occupiedSlots } from './agenda-logic';
import { BookingCard } from './BookingCard';
import { EQUIPMENT_ICONS } from './equipment-icons';
import { EQUIPMENT_LABELS, type Booking, type Room } from './types';

interface AgendaGridProps {
  /** Fecha mostrada (`AAAA-MM-DD` en `BUSINESS_TZ`). */
  date: string;
  /** ¿La fecha mostrada es hoy? Activa la línea de hora actual (CA8) y el estado en vivo de cada sala. */
  isToday: boolean;
  now: Date;
  rooms: Room[];
  bookings: Booking[];
  /** Día cerrado: ningún hueco es clicable (RN-10, CA5). */
  closed: boolean;
  /** Clic o Enter en un hueco libre (T08 CA7): abre el formulario de reserva (T08a). */
  onSelectSlot: (roomId: string, startAt: Date) => void;
  /** Clic, Enter o Espacio en una reserva: abre su detalle (T09). */
  onSelectBooking: (booking: Booking) => void;
}

const HOURS = SLOT_STARTS.filter((m) => m % 60 === 0);

/**
 * Línea de tiempo (DESIGN.md, «Arquitectura de la línea de tiempo»): eje de horas fijo de 64 px, una columna por
 * sala (≥ 180 px, reparto igual y desplazamiento horizontal si no caben) y 52 franjas de 15 min de 16 px.
 */
export function AgendaGrid({
  date,
  isToday,
  now,
  rooms,
  bookings,
  closed,
  onSelectSlot,
  onSelectBooking,
}: AgendaGridProps) {
  const byRoom = useMemo(() => bookingsByRoom(bookings), [bookings]);
  // Instante de inicio de cada franja del día (una sola vez por fecha).
  const slotTimes = useMemo(() => SLOT_STARTS.map((m) => zonedInstant(date, m)), [date]);
  const nowMs = now.getTime();
  const nowMinutes = isToday ? localMinutes(now) : null;
  const showNowLine = nowMinutes !== null && nowMinutes >= OPEN_MINUTES && nowMinutes < CLOSE_MINUTES;

  const columns = `${TIME_AXIS_WIDTH_PX}px repeat(${rooms.length}, minmax(${ROOM_COLUMN_MIN_PX}px, 1fr))`;

  return (
    <div className="max-h-[calc(100dvh-12rem)] min-h-96 overflow-auto rounded-lg border border-divider bg-surface-container-lowest">
      <div className="grid" style={{ gridTemplateColumns: columns }}>
        {/* Encabezado fijo: esquina y una cabecera por sala */}
        <div className="sticky top-0 left-0 z-20 flex items-end border-r border-b border-divider bg-surface-container-lowest px-space-sm pb-space-sm">
          <span className="text-label-xs text-on-surface-variant uppercase">Hora</span>
        </div>
        {rooms.map((room) => (
          <RoomHeader key={room.id} room={room} busyNow={isToday ? isBusyAt(byRoom.get(room.id), nowMinutes) : null} />
        ))}

        {/* Eje de horas */}
        <div
          className="sticky left-0 z-10 border-r border-divider bg-surface-container-lowest"
          style={{ height: GRID_HEIGHT_PX }}
        >
          {HOURS.map((m) => (
            <span
              key={m}
              className="absolute right-space-sm text-label-xs font-normal text-on-surface-variant tnum"
              style={{ top: (m - OPEN_MINUTES) * PX_PER_MINUTE + 2 }}
            >
              {formatMinutes(m)}
            </span>
          ))}
          {showNowLine && (
            <span
              className="absolute right-0 z-10 -translate-y-1/2 rounded-full bg-error px-space-xs text-label-xs text-on-error tnum"
              style={{ top: (nowMinutes - OPEN_MINUTES) * PX_PER_MINUTE }}
            >
              {formatMinutes(nowMinutes)}
            </span>
          )}
        </div>

        {/* Columnas de sala */}
        {rooms.map((room) => (
          <RoomColumn
            key={room.id}
            room={room}
            slotTimes={slotTimes}
            nowMs={nowMs}
            bookings={byRoom.get(room.id) ?? []}
            closed={closed}
            onSelectSlot={onSelectSlot}
            onSelectBooking={onSelectBooking}
            nowLineTop={showNowLine ? (nowMinutes - OPEN_MINUTES) * PX_PER_MINUTE : null}
          />
        ))}
      </div>
    </div>
  );
}

/** ¿Hay una reserva de la sala en curso en este minuto? `null` si no aplica (otro día). */
function isBusyAt(bookings: Booking[] | undefined, minutes: number | null): boolean | null {
  if (minutes === null) return null;
  return (bookings ?? []).some((b) => {
    const { start, end } = bookingMinutes(b);
    return start <= minutes && minutes < end;
  });
}

function RoomHeader({ room, busyNow }: { room: Room; busyNow: boolean | null }) {
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-space-xs border-r border-b border-divider bg-surface-container-lowest px-space-md py-space-sm">
      <div className="flex items-center gap-space-sm">
        {busyNow !== null && (
          <span
            className={cn('size-2 shrink-0 rounded-full', busyNow ? 'bg-busy' : 'bg-available')}
            title={busyNow ? 'Ocupada ahora' : 'Libre ahora'}
          >
            <span className="sr-only">{busyNow ? 'Ocupada ahora' : 'Libre ahora'}</span>
          </span>
        )}
        <h2 className="min-w-0 truncate text-headline-sm text-ink" title={room.name}>
          {room.name}
        </h2>
        <Badge tone="primary" className="ml-auto shrink-0 tnum">
          {room.capacity} pax<span className="sr-only"> (capacidad)</span>
        </Badge>
      </div>
      <ul className="flex min-h-4 flex-wrap gap-x-space-sm gap-y-px text-label-xs font-normal text-on-surface-variant">
        {room.equipment.length === 0 ? (
          <li>Sin equipamiento</li>
        ) : (
          room.equipment.map((e) => (
            <li key={e} className="inline-flex items-center gap-1">
              <span aria-hidden="true">{EQUIPMENT_ICONS[e]}</span>
              {EQUIPMENT_LABELS[e]}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

interface RoomColumnProps {
  room: Room;
  slotTimes: Date[];
  nowMs: number;
  bookings: Booking[];
  closed: boolean;
  onSelectSlot: (roomId: string, startAt: Date) => void;
  onSelectBooking: (booking: Booking) => void;
  nowLineTop: number | null;
}

function RoomColumn({
  room,
  slotTimes,
  nowMs,
  bookings,
  closed,
  onSelectSlot,
  onSelectBooking,
  nowLineTop,
}: RoomColumnProps) {
  const taken = useMemo(() => occupiedSlots(bookings), [bookings]);

  return (
    <div
      role="group"
      aria-label={room.name}
      className={cn('relative border-r border-divider', closed && 'bg-maintenance-container')}
      style={{ height: GRID_HEIGHT_PX }}
    >
      {SLOT_STARTS.map((m, i) => {
        const startAt = slotTimes[i];
        const lineClass = (m + SLOT_MINUTES) % 60 === 0 ? 'border-divider' : 'border-mist';
        // Hueco libre: no lo cubre una reserva, no ha empezado (RN-05) y el día no está cerrado (RN-10).
        const selectable = !closed && !taken.has(m) && startAt.getTime() > nowMs;
        if (!selectable) {
          return (
            <div
              key={m}
              aria-hidden="true"
              className={cn('h-4 border-b', lineClass, !closed && !taken.has(m) && 'bg-canvas')}
            />
          );
        }
        const time = formatMinutes(m);
        return (
          <button
            key={m}
            type="button"
            onClick={() => onSelectSlot(room.id, startAt)}
            aria-label={`${room.name}, ${time}, libre`}
            className={cn(
              'group flex h-4 w-full scroll-mt-20 scroll-ml-16 items-center border-b px-space-sm text-left',
              lineClass,
              'hover:bg-interactive/6 hover:outline hover:-outline-offset-1 hover:outline-interactive',
              'focus-visible:bg-interactive/6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-container',
            )}
          >
            <span
              aria-hidden="true"
              className="hidden text-label-xs text-primary-container tnum group-hover:inline group-focus-visible:inline"
            >
              + Libre {time}
            </span>
          </button>
        );
      })}
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} onSelect={onSelectBooking} />
      ))}
      {nowLineTop !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-[2] h-0.5 -translate-y-1/2 bg-error"
          style={{ top: nowLineTop }}
        />
      )}
    </div>
  );
}
