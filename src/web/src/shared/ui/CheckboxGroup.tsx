import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from './cn';

export interface CheckboxOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface CheckboxGroupProps {
  legend: string;
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  /** Oculta la leyenda visualmente (se mantiene para lectores de pantalla). */
  hideLegend?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Selección múltiple en píldoras (equipamiento, D-25). Cada opción es un checkbox nativo: se usa con teclado
 * (Tab + Espacio) y el estado activo se comunica con el icono de check además del color.
 */
export function CheckboxGroup({
  legend,
  options,
  value,
  onChange,
  error,
  hideLegend,
  disabled,
  className,
}: CheckboxGroupProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const toggle = (option: string, checked: boolean) =>
    onChange(checked ? [...value, option] : value.filter((v) => v !== option));

  return (
    <fieldset className={cn('flex flex-col gap-space-xs', className)} aria-describedby={errorId} disabled={disabled}>
      <legend className={cn('mb-space-xs text-label-md text-on-surface', hideLegend && 'sr-only')}>{legend}</legend>
      <div className="flex flex-wrap gap-space-sm">
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label
              key={o.value}
              className={cn(
                'inline-flex cursor-pointer items-center gap-space-xs rounded-full border px-space-md py-space-xs text-label-sm transition-colors',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary-container',
                'has-disabled:cursor-not-allowed has-disabled:opacity-50',
                checked
                  ? 'border-primary-container bg-primary-container text-on-primary'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low',
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={(e) => toggle(o.value, e.target.checked)}
              />
              {checked ? <Check aria-hidden="true" size={14} /> : o.icon && <span aria-hidden="true">{o.icon}</span>}
              {o.label}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="text-body-sm text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
