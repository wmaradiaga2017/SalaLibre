import { CircleAlert, Inbox, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { cn } from './cn';

interface EmptyStateProps {
  /** Texto específico de la pantalla (spec §9): "No tienes reservas próximas", "Sin registros para estos filtros"… */
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Estado vacío con icono neutro (spec §9). */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-space-sm px-gutter py-space-xl text-center', className)}>
      <span aria-hidden="true" className="text-outline">
        {icon ?? <Inbox size={32} />}
      </span>
      <p className="text-headline-sm text-on-surface">{title}</p>
      {description && <p className="max-w-md text-body-md text-on-surface-variant">{description}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  /** Request ID del error del API (D-06), para que la persona lo informe. */
  requestId?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Estado de error (spec §9): mensaje, `requestId` y botón "Reintentar". */
export function ErrorState({ message, requestId, onRetry, retrying, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-space-sm px-gutter py-space-xl text-center', className)}
    >
      <CircleAlert aria-hidden="true" size={32} className="text-error" />
      <p className="text-headline-sm text-on-surface">{message}</p>
      {requestId && (
        <p className="text-body-sm text-on-surface-variant">
          Código de seguimiento: <code className="text-code-sm text-on-surface">{requestId}</code>
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} loading={retrying} icon={<RotateCw size={16} />}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
