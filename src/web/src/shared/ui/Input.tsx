import type { InputHTMLAttributes, Ref, SelectHTMLAttributes } from 'react';
import { cn } from './cn';

/** Estilo común de los controles de formulario: 4 px de radio, borde `outline-variant`, error en rojo. */
const CONTROL =
  'h-10 w-full rounded-base border border-outline-variant bg-surface-container-lowest px-space-md text-body-md ' +
  'text-on-surface placeholder:text-on-surface-variant transition-colors hover:border-outline ' +
  'focus-visible:border-primary-container focus-visible:outline-2 focus-visible:outline-offset-0 ' +
  'focus-visible:outline-primary-container disabled:cursor-not-allowed disabled:bg-mist disabled:opacity-70 ' +
  'aria-invalid:border-error';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

/** Campo de texto. Compatible con React Hook Form (`ref` como prop en React 19). */
export function Input({ className, ref, ...rest }: InputProps) {
  return <input ref={ref} className={cn(CONTROL, className)} {...rest} />;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  /** Opción vacía inicial (p. ej. "Todas las acciones"). */
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
}

/** Lista desplegable nativa (accesible por teclado) con el estilo de los controles. */
export function Select({ options, placeholder, className, ref, ...rest }: SelectProps) {
  return (
    <select ref={ref} className={cn(CONTROL, 'pr-8', className)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
