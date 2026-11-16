import { SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toApiError } from '../../shared/apiClient';
import { formatLongDate, localDate, useNow } from '../../shared/datetime';
import { Banner, Button, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { useAuth } from '../auth/auth-context';
import { agendaDays, hasFilters, NO_FILTERS, visibleRooms, type RoomFilterValue } from './agenda-logic';
import { useBookings, useClosures, useRooms } from './agenda-queries';
import { AgendaGrid } from './AgendaGrid';
import { DayPicker } from './DayPicker';
import { RoomFilters } from './RoomFilters';

/** Hasta T08a, elegir un hueco libre no abre nada (fuera de alcance de T08). */
function noSlotAction() {}

/**
 * `/agenda` (spec §9, F-02 pasos 1–2, D-18): disponibilidad del día de todas las salas activas en franjas de 15 min,
 * con selector de día, filtros en el cliente y banner de día cerrado. Todo lo que se dibuja sale del API.
 */
export function AgendaPage({ onSelectSlot = noSlotAction }: { onSelectSlot?: (roomId: string, startAt: Date) => void }) {
  const { user } = useAuth();
  const now = useNow();
  const today = localDate(now);
  const days = useMemo(() => agendaDays(today), [today]);

  const [selected, setSelected] = useState<string | null>(null);
  // Primer día hábil ofrecido (hoy, o el lunes si hoy es fin de semana) hasta que la persona elija otro.
  const day = selected && days.includes(selected) ? selected : days[0];
  const [filters, setFilters] = useState<RoomFilterValue>(NO_FILTERS);

  const rooms = useRooms();
  const bookings = useBookings(day);
  const closures = useClosures();

  const closedDates = useMemo(() => new Set((closures.data ?? []).map((c) => c.date)), [closures.data]);
  const closure = closures.data?.find((c) => c.date === day);
  const activeRooms = useMemo(() => visibleRooms(rooms.data ?? [], NO_FILTERS), [rooms.data]);
  const columns = useMemo(() => visibleRooms(rooms.data ?? [], filters), [rooms.data, filters]);

  const failed = [rooms, closures, bookings].filter((q) => q.isError);
  const loading = rooms.isPending || closures.isPending || bookings.isPending;

  const retry = () => failed.forEach((q) => void q.refetch());

  let content;
  if (failed.length > 0) {
    const error = toApiError(failed[0].error);
    content = (
      <ErrorState
        message={error.message}
        requestId={error.requestId}
        onRetry={retry}
        retrying={failed.some((q) => q.isFetching)}
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else if (loading) {
    content = <AgendaSkeleton />;
  } else if (activeRooms.length === 0) {
    content = (
      <EmptyState
        title="No hay salas activas"
        description={
          user?.role === 'ADMIN' ? 'Activa o crea una sala en Salas para verla en la agenda.' : 'Consulta con RR. HH.'
        }
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else if (columns.length === 0) {
    content = (
      <EmptyState
        title="Ninguna sala cumple los filtros"
        description="Prueba con una capacidad menor o con menos equipos."
        icon={<SearchX size={32} />}
        action={
          <Button variant="secondary" onClick={() => setFilters(NO_FILTERS)}>
            Limpiar filtros
          </Button>
        }
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else {
    content = (
      <AgendaGrid
        date={day}
        isToday={day === today}
        now={now}
        rooms={columns}
        bookings={bookings.data ?? []}
        closed={closure !== undefined}
        onSelectSlot={onSelectSlot}
      />
    );
  }

  return (
    <section aria-labelledby="titulo-agenda" className="flex flex-col gap-space-md">
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <h1 id="titulo-agenda" className="text-headline-lg text-ink">
          Agenda
        </h1>
        <DayPicker days={days} value={day} onChange={setSelected} today={today} closedDates={closedDates} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-space-md rounded-lg border border-divider bg-surface-container-lowest px-gutter py-space-md">
        <RoomFilters value={filters} onChange={setFilters} />
        <Legend />
      </div>

      {closure && (
        <Banner tone="maintenance" title={`Día cerrado: ${formatLongDate(closure.date)}`}>
          {closure.reason}. Ese día no se puede reservar ninguna sala.
        </Banner>
      )}

      <div aria-busy={loading || bookings.isFetching} aria-live="polite" className="sr-only">
        {loading ? 'Cargando la agenda' : `Agenda del ${formatLongDate(day)}${hasFilters(filters) ? ', con filtros' : ''}`}
      </div>

      {content}
    </section>
  );
}

/** Leyenda de estados (prototipo): el significado no depende solo del color. */
function Legend() {
  return (
    <ul aria-label="Leyenda" className="flex flex-wrap items-center gap-x-space-md gap-y-space-xs text-label-sm text-on-surface-variant">
      <li className="inline-flex items-center gap-space-xs">
        <span aria-hidden="true" className="h-3 w-4 rounded-base border border-outline-variant bg-surface-container-lowest" />
        Libre
      </li>
      <li className="inline-flex items-center gap-space-xs">
        <span aria-hidden="true" className="h-3 w-4 rounded-base border-l-[3px] border-l-primary-container bg-surface-container" />
        Tu reserva
      </li>
      <li className="inline-flex items-center gap-space-xs">
        <span aria-hidden="true" className="h-3 w-4 rounded-base border-l-[3px] border-l-busy bg-surface-container" />
        Ocupado
      </li>
      <li className="inline-flex items-center gap-space-xs">
        <span aria-hidden="true" className="h-3 w-4 rounded-base border border-divider bg-canvas" />
        Ya pasó
      </li>
    </ul>
  );
}

/** Esqueleto de la grilla mientras llegan salas, reservas y cierres (spec §9, "Cargando"). */
function AgendaSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-space-sm rounded-lg border border-divider bg-surface-container-lowest p-gutter">
      <div className="flex gap-space-sm">
        <Skeleton className="h-12 w-16" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 flex-1" />
        ))}
      </div>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex gap-space-sm">
          <Skeleton className="h-10 w-16" />
          {Array.from({ length: 5 }, (_, j) => (
            <Skeleton key={j} className="h-10 flex-1 opacity-60" />
          ))}
        </div>
      ))}
    </div>
  );
}
