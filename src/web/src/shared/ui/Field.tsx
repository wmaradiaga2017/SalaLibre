import { useId, type ReactNode } from 'react';
import { cn } from './cn';

/** Atributos que `Field` entrega al control para asociarlo con su etiqueta, ayuda y error. */
export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

interface FieldProps {
  label: string;
  /** Mensaje de error de validación; se asocia al control con `aria-describedby`. */
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Etiqueta + control + ayuda + error (spec §11: formularios con `label` asociado). Uso:
 * `<Field label="Título" error={e}>{(p) => <Input {...p} {...register('title')} />}</Field>`.
 */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-space-xs', className)}>
      <label htmlFor={id} className="text-label-md text-on-surface">
        {label}
        {required && (
          <span aria-hidden="true" className="text-error">
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p id={hintId} className="text-body-sm text-on-surface-variant">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
