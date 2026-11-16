import { DoorOpen, Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { useRef, useState } from 'react';
import { toApiError } from '../../shared/apiClient';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Skeleton,
  Table,
  useToast,
  type Column,
} from '../../shared/ui';
import { EQUIPMENT_ICONS } from './equipment-icons';
import { RoomFormModal } from './RoomFormModal';
import { useRooms, useUpdateRoom } from './rooms-queries';
import { EQUIPMENT, EQUIPMENT_LABELS, type Room } from './types';

/** Qué modal está abierto: crear, editar una sala o confirmar su desactivación. */
type Dialog = { kind: 'create' } | { kind: 'edit'; room: Room } | { kind: 'deactivate'; room: Room } | null;

/**
 * `/admin/rooms` (spec §9, F-05; T10): tabla con todas las salas, activas e inactivas (el API se las da al `ADMIN`
 * ordenadas por nombre), crear y editar en modal, y desactivar (con confirmación) o activar. Desactivar no toca las
 * reservas existentes (D-14). Del prototipo de Stitch solo se toman las filas por sala y el estado activo/inactivo.
 */
export function AdminRoomsPage() {
  const toast = useToast();
  const rooms = useRooms();
  const updateRoom = useUpdateRoom();
  const [dialog, setDialog] = useState<Dialog>(null);
  // Candado síncrono para activar/desactivar (B-141): un doble clic no manda dos `PATCH`.
  const toggling = useRef(false);

  const setActive = (room: Room, isActive: boolean) => {
    if (toggling.current) return;
    toggling.current = true;
    updateRoom.mutate(
      { id: room.id, changes: { isActive } },
      {
        onSuccess: (updated) => {
          toast.show({
            tone: 'success',
            message: isActive
              ? `${updated.name} está activa y vuelve a aparecer en la agenda.`
              : `${updated.name} quedó inactiva. Sus reservas existentes se mantienen.`,
          });
          setDialog(null);
        },
        onError: (error) => {
          const apiError = toApiError(error);
          setDialog(null);
          toast.show({ tone: 'error', message: apiError.message, requestId: apiError.requestId });
        },
        onSettled: () => {
          toggling.current = false;
        },
      },
    );
  };

  const columns: Column<Room>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (r) => <span className="text-label-md text-ink">{r.name}</span>,
    },
    {
      key: 'capacity',
      header: 'Capacidad',
      numeric: true,
      render: (r) => `${r.capacity} ${r.capacity === 1 ? 'persona' : 'personas'}`,
    },
    { key: 'location', header: 'Ubicación', render: (r) => r.location },
    {
      key: 'equipment',
      header: 'Equipamiento',
      render: (r) =>
        r.equipment.length === 0 ? (
          <span className="text-body-sm text-on-surface-variant">Sin equipamiento</span>
        ) : (
          <ul className="flex flex-wrap gap-space-xs">
            {EQUIPMENT.filter((e) => r.equipment.includes(e)).map((e) => (
              <li
                key={e}
                className="inline-flex items-center gap-space-xs rounded-base bg-mist px-space-sm py-px text-label-sm text-on-surface-variant"
              >
                <span aria-hidden="true">{EQUIPMENT_ICONS[e]}</span>
                {EQUIPMENT_LABELS[e]}
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => (
        <Badge tone={r.isActive ? 'available' : 'maintenance'} dot>
          {r.isActive ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      hideHeader: true,
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-space-xs">
          <Button
            variant="ghost"
            icon={<Pencil size={16} />}
            aria-label={`Editar ${r.name}`}
            onClick={() => setDialog({ kind: 'edit', room: r })}
          >
            Editar
          </Button>
          {r.isActive ? (
            <Button
              variant="ghost"
              icon={<PowerOff size={16} />}
              aria-label={`Desactivar ${r.name}`}
              onClick={() => setDialog({ kind: 'deactivate', room: r })}
            >
              Desactivar
            </Button>
          ) : (
            <Button
              variant="ghost"
              icon={<Power size={16} />}
              aria-label={`Activar ${r.name}`}
              loading={updateRoom.isPending && updateRoom.variables?.id === r.id}
              onClick={() => setActive(r, true)}
            >
              Activar
            </Button>
          )}
        </div>
      ),
    },
  ];

  let content;
  if (rooms.isError) {
    const error = toApiError(rooms.error);
    content = (
      <ErrorState
        message={error.message}
        requestId={error.requestId}
        onRetry={() => void rooms.refetch()}
        retrying={rooms.isFetching}
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else if (rooms.isPending) {
    content = <RoomsSkeleton />;
  } else if (rooms.data.length === 0) {
    content = (
      <EmptyState
        title="No hay salas registradas"
        description="Crea la primera sala para que aparezca en la agenda."
        icon={<DoorOpen size={32} />}
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else {
    content = <Table caption="Salas de reunión" columns={columns} rows={rooms.data} rowKey={(r) => r.id} />;
  }

  const active = rooms.data?.filter((r) => r.isActive).length ?? 0;
  const inactive = (rooms.data?.length ?? 0) - active;

  return (
    <section aria-labelledby="titulo-salas" className="flex flex-col gap-space-md">
      <div className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex flex-wrap items-center gap-space-md">
            <h1 id="titulo-salas" className="text-headline-lg text-ink">
              Salas
            </h1>
            {rooms.isSuccess && rooms.data.length > 0 && (
              <Badge tone="primary">
                <span className="tnum">{active}</span> {active === 1 ? 'activa' : 'activas'}
                {inactive > 0 && (
                  <>
                    {' · '}
                    <span className="tnum">{inactive}</span> {inactive === 1 ? 'inactiva' : 'inactivas'}
                  </>
                )}
              </Badge>
            )}
          </div>
          <p className="text-body-md text-on-surface-variant">
            Las salas inactivas no aparecen en la agenda ni admiten reservas nuevas.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setDialog({ kind: 'create' })}>
          Nueva sala
        </Button>
      </div>

      <div aria-busy={rooms.isFetching} aria-live="polite" className="sr-only">
        {rooms.isPending ? 'Cargando las salas' : ''}
      </div>

      {content}

      {dialog?.kind === 'create' && <RoomFormModal onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <RoomFormModal room={dialog.room} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog?.kind === 'deactivate'}
        title={dialog?.kind === 'deactivate' ? `¿Desactivar ${dialog.room.name}?` : ''}
        confirmLabel="Desactivar sala"
        loading={updateRoom.isPending}
        onConfirm={() => dialog?.kind === 'deactivate' && setActive(dialog.room, false)}
        onCancel={() => setDialog(null)}
      >
        <p>Dejará de aparecer en la agenda y no admitirá reservas nuevas.</p>
        <p className="mt-space-sm text-on-surface-variant">
          Sus reservas existentes no se cancelan. Puedes volver a activarla cuando quieras.
        </p>
      </ConfirmDialog>
    </section>
  );
}

/** Esqueleto de la tabla mientras carga (spec §9, Cargando). */
function RoomsSkeleton() {
  return (
    <div className="flex flex-col gap-space-sm rounded-lg border border-divider bg-surface-container-lowest p-gutter">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
