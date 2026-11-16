import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Texto de la consecuencia (DESIGN.md, Componentes 6): p. ej. "Se cancelarán 3 reservas de ese día". */
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` para acciones destructivas o irreversibles (cancelar, desactivar, cerrar un día). */
  tone?: 'primary' | 'danger';
  /** Petición en curso: deshabilita los botones y no deja cerrar el diálogo. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmación propio (F-03: nunca `confirm()` del navegador). Ancho de 480 px. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Volver',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-body-md text-on-surface">{children}</div>
    </Modal>
  );
}
