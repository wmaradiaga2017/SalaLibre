import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { ApiError, toApiError } from '../../shared/apiClient';
import { Banner, Button, Field, Input } from '../../shared/ui';
import { useAuth } from './auth-context';
import { authService } from './authService';
import { PasswordField } from './PasswordField';

export type LoginFocus = 'none' | 'email' | 'password';
export type LoginSubmitStatus = 'idle' | 'loading' | 'error' | 'success';

/** Mensaje genérico de F-01 (A07): no dice si falló el correo o la contraseña. */
const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos';

/** Espera máxima antes de ir a `/agenda` para ver la celebración (T07c, CA12: no más de 1 s). */
const MAX_SUCCESS_DELAY_MS = 1000;

/** CA9: correo obligatorio y con formato; contraseña obligatoria, sin regla de longitud (eso es RN-18, al cambiarla). */
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'Escribe tu correo electrónico.' })
    .pipe(z.email({ error: 'Escribe un correo electrónico válido.' })),
  password: z.string().min(1, { error: 'Escribe tu contraseña.' }),
});

type LoginValues = z.input<typeof loginSchema>;
type LoginData = z.output<typeof loginSchema>;

interface LoginFormProps {
  /** Campo con el foco (lo usan los personajes de T07c). */
  onFocusChange?: (focus: LoginFocus) => void;
  /** Contraseña visible u oculta (T07c). Nunca se entrega el valor de la contraseña. */
  onPasswordVisibleChange?: (visible: boolean) => void;
  /** Estado del envío (T07c). */
  onSubmitStatusChange?: (status: LoginSubmitStatus) => void;
  /** Contenido bajo el campo de contraseña (T07c: enlace "¿Olvidaste tu contraseña?"). */
  afterPassword?: ReactNode;
  /** Espera tras un login correcto antes de ir a `/agenda` (T07c: celebración; tope de 1 s). */
  successDelayMs?: number;
}

const STATUS_TEXT: Record<LoginSubmitStatus, string> = {
  idle: '',
  loading: 'Iniciando sesión…',
  error: 'No se pudo iniciar sesión.',
  success: 'Sesión iniciada. Entrando a la agenda…',
};

/** Formulario de inicio de sesión (F-01) contra `POST /api/auth/login`. Al entrar va a `/agenda`. */
export function LoginForm({
  onFocusChange,
  onPasswordVisibleChange,
  onSubmitStatusChange,
  afterPassword,
  successDelayMs = 0,
}: LoginFormProps) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoginSubmitStatus>('idle');
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CA14: si la pantalla se desmonta durante la espera, se cancela el temporizador.
  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  const changeStatus = (next: LoginSubmitStatus) => {
    setStatus(next);
    onSubmitStatusChange?.(next);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues, unknown, LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: ({ email, password }: LoginData) => authService.login(email, password),
    // La contraseña no queda en la caché de mutaciones al salir de la pantalla (A07).
    gcTime: 0,
    onMutate: () => changeStatus('loading'),
    onSuccess: (user) => {
      changeStatus('success');
      const enter = () => {
        signIn(user);
        navigate('/agenda', { replace: true });
      };
      const delay = Math.min(Math.max(successDelayMs, 0), MAX_SUCCESS_DELAY_MS);
      if (delay === 0) enter();
      else redirectTimer.current = setTimeout(enter, delay);
    },
    onError: () => changeStatus('error'),
  });

  const busy = login.isPending || status === 'success';

  const onSubmit = handleSubmit((data) => {
    // Sin envíos duplicados mientras hay una petición en curso o se está entrando (spec §9, Cargando; T07c CA7).
    if (busy) return;
    login.mutate(data);
  });

  const email = register('email');
  const password = register('password');
  const focusHandlers = (field: Exclude<LoginFocus, 'none'>, onBlur: (e: FocusEvent<HTMLInputElement>) => unknown) => ({
    onFocus: () => onFocusChange?.(field),
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      onFocusChange?.('none');
      return onBlur(e);
    },
  });

  const apiError = login.error ? toApiError(login.error) : null;
  const isInvalidCredentials = apiError instanceof ApiError && apiError.status === 401;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-space-lg">
      {/* CA7: anuncia carga, error y éxito a los lectores de pantalla. */}
      <p role="status" className="sr-only">
        {STATUS_TEXT[status]}
      </p>

      {apiError && (
        <Banner tone="error" requestId={apiError.requestId}>
          {isInvalidCredentials ? INVALID_CREDENTIALS_MESSAGE : apiError.message}
        </Banner>
      )}

      <Field label="Correo electrónico" error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="tu@ejemplo.com"
            {...email}
            {...focusHandlers('email', email.onBlur)}
          />
        )}
      </Field>

      <div className="flex flex-col gap-space-sm">
        <Field label="Contraseña" error={errors.password?.message}>
          {(control) => (
            <PasswordField
              {...control}
              autoComplete="current-password"
              placeholder="Escribe tu contraseña"
              onPasswordVisibleChange={onPasswordVisibleChange}
              {...password}
              {...focusHandlers('password', password.onBlur)}
            />
          )}
        </Field>
        {afterPassword}
      </div>

      <Button type="submit" size="lg" loading={busy} className="w-full">
        Iniciar sesión
        {!busy && <ArrowUpRight aria-hidden="true" size={18} />}
      </Button>
    </form>
  );
}
