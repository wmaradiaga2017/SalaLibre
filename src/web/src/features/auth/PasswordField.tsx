import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes, type Ref } from 'react';
import { Input, cn } from '../../shared/ui';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  ref?: Ref<HTMLInputElement>;
  /** Avisa cuando la contraseña pasa a verse u ocultarse (lo usa T07c). Nunca recibe el valor. */
  onPasswordVisibleChange?: (visible: boolean) => void;
}

/**
 * Campo de contraseña con botón para mostrarla u ocultarla (spec §9, CA10). Recibe los atributos de `Field`
 * (`id`, `aria-describedby`, `aria-invalid`) y los de `register` de React Hook Form.
 */
export function PasswordField({ onPasswordVisibleChange, className, ref, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const toggle = () => {
    const next = !visible;
    setVisible(next);
    onPasswordVisibleChange?.(next);
  };

  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} {...inputProps} />
      <button
        type="button"
        onClick={toggle}
        // Con el ratón, el foco se queda en el campo (T07c, CA11: al ocultarla, si la contraseña conserva el foco,
        // los personajes vuelven a mirar a la izquierda). Con el teclado, el botón recibe el foco como siempre.
        onMouseDown={(event) => event.preventDefault()}
        aria-pressed={visible}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-controls={inputProps.id}
        className={cn(
          'absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-base text-on-surface-variant',
          'hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-container',
        )}
      >
        {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
      </button>
    </div>
  );
}
