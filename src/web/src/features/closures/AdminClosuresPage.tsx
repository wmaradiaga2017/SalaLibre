import { CalendarOff, CalendarPlus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toApiError } from '../../shared/apiClient';
import { formatLongDate, localDate, useNow } from '../../shared/datetime';
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
import { ClosureFormModal } from './ClosureFormModal';
import { useClosures, useDeleteClosure } from './closures-queries';
import type { Closure } from './types';

type Dialog = { kind: 'create' } | { kind: 'delete'; closure: Closure } | null;

/**
 * `/admin/closures` (spec §9, F-07; T10b): lista de cierres de hoy en adelante ordenados por fecha (lo hace el API),
 * registrar uno nuevo (con aviso de cuántas reservas se cancelarán) y eliminar los posteriores a hoy (RN-24; no restaura
 * reservas, S-05). Sin prototipo de Stitch: tabla, modal, insignia y diálogo de confirmación de DESIGN.md.
 */
export function AdminClosuresPage() {
  const toast = useToast();
  const today = localDate(useNow());
  const closures = useClosures();
  const deleteClosure = useDeleteClosure();
  const [dialog, setDialog] = useState<Dialog>(null);
  // Candado síncrono contra el doble clic al eliminar (B-141).
  const deleting = useRef(false);

  const remove = (closure: Closure) => {
    if (deleting.current) return;
    deleting.current = true;
    deleteClosure.mutate(closure.id, {
      onSuccess: () => {
        toast.show({
          tone: 'success',
          message: `Se eliminó el cierre del ${formatLongDate(closure.date)}. Ese día se puede volver a reservar.`,
        });
        setDialog(null);
      },
      onError: (error) => {
        // 422 `CLOSURE_IN_PAST` (el día ya llegó) o 404 (ya no existe): aviso con el `requestId`; la lista se recarga.
        const apiError = toApiError(error);
        setDialog(null);
        toast.show({ tone: 'error', message: apiError.message, requestId: apiError.requestId });
      },
      onSettled: () => {
        deleting.current = false;
      },
    });
  };

  const columns: Column<Closure>[] = [
    {
      key: 'date',
      header: 'Fecha',
      numeric: true,
      render: (c) => (
        <span className="flex flex-wrap items-center gap-space-sm">
          <span className="text-label-md text-ink">{formatLongDate(c.date)}</span>
          {c.date === today && <Badge tone="maintenance">Hoy</Badge>}
        </span>
      ),
    },
    { key: 'reason', header: 'Motivo', render: (c) => <span className="break-words">{c.reason}</span> },
    {
      key: 'actions',
      header: 'Acciones',
      hideHeader: true,
      align: 'right',
      render: (c) => {
        const past = c.date <= today;
        return (
          <Button
            variant="ghost"
            icon={<Trash2 size={16} />}
            aria-label={
              past
                ? `El cierre del ${formatLongDate(c.date)} ya no se puede eliminar`
                : `Eliminar el cierre del ${formatLongDate(c.date)}`
            }
            title={past ? 'Solo se eliminan cierres con fecha posterior a hoy.' : undefined}
            disabled={past}
            onClick={() => setDialog({ kind: 'delete', closure: c })}
          >
            Eliminar
          </Button>
        );
      },
    },
  ];

  let content;
  if (closures.isError) {
    const error = toApiError(closures.error);
    content = (
      <ErrorState
        message={error.message}
        requestId={error.requestId}
        onRetry={() => void closures.refetch()}
        retrying={closures.isFetching}
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else if (closures.isPending) {
    content = (
      <div className="flex flex-col gap-space-sm rounded-lg border border-divider bg-surface-container-lowest p-gutter">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  } else if (closures.data.length === 0) {
    content = (
      <EmptyState
        title="No hay cierres programados"
        description="Registra un día cerrado para que nadie pueda reservar ese día."
        icon={<CalendarOff size={32} />}
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else {
    content = <Table caption="Días cerrados" columns={columns} rows={closures.data} rowKey={(c) => c.id} />;
  }

  const target = dialog?.kind === 'delete' ? dialog.closure : null;

  return (
    <section aria-labelledby="titulo-cierres" className="flex max-w-4xl flex-col gap-space-md">
      <div className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex flex-wrap items-center gap-space-md">
            <h1 id="titulo-cierres" className="text-headline-lg text-ink">
              Cierres
            </h1>
            {closures.isSuccess && closures.data.length > 0 && (
              <Badge tone="primary">
                <span className="tnum">{closures.data.length}</span>{' '}
                {closures.data.length === 1 ? 'programado' : 'programados'}
              </Badge>
            )}
          </div>
          <p className="text-body-md text-on-surface-variant">
            Días en que nadie puede reservar ninguna sala. Registrar uno cancela las reservas confirmadas de ese día.
          </p>
        </div>
        <Button icon={<CalendarPlus size={16} />} onClick={() => setDialog({ kind: 'create' })}>
          Nuevo cierre
        </Button>
      </div>

      <div aria-busy={closures.isFetching} aria-live="polite" className="sr-only">
        {closures.isPending ? 'Cargando los cierres' : ''}
      </div>

      {content}

      {dialog?.kind === 'create' && <ClosureFormModal onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={target !== null}
        title={target ? `¿Eliminar el cierre del ${formatLongDate(target.date)}?` : ''}
        confirmLabel="Eliminar cierre"
        loading={deleteClosure.isPending}
        onConfirm={() => target && remove(target)}
        onCancel={() => setDialog(null)}
      >
        <p>Ese día se podrá volver a reservar.</p>
        <p className="mt-space-sm">
          <strong className="text-ink">Las reservas que se cancelaron al cerrarlo no se restauran.</strong>
        </p>
      </ConfirmDialog>
    </section>
  );
}
