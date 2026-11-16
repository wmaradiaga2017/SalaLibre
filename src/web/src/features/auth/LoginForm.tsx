import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import type { FocusEvent } from 'react';
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
}

/** Formulario de inicio de sesión (F-01) contra `POST /api/auth/login`. Al entrar va a `/agenda`. */
export function LoginForm({ onFocusChange, onPasswordVisibleChange, onSubmitStatusChange }: LoginFormProps) {
  const { signIn } = useAuth();
  const navigate = useNavigate();

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
    onMutate: () => onSubmitStatusChange?.('loading'),
    onSuccess: (user) => {
      onSubmitStatusChange?.('success');
      signIn(user);
      navigate('/agenda', { replace: true });
    },
    onError: () => onSubmitStatusChange?.('error'),
  });

  const onSubmit = handleSubmit((data) => {
    // Sin envíos duplicados mientras hay una petición en curso (spec §9, Cargando).
    if (login.isPending) return;
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

      <Button
        type="submit"
        size="lg"
        loading={login.isPending}
        className="w-full"
        icon={login.isPending ? undefined : <ArrowUpRight size={18} />}
      >
        Iniciar sesión
      </Button>
    </form>
  );
}
