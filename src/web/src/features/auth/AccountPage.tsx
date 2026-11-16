import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toApiError, type ApiError } from '../../shared/apiClient';
import { Banner, Button, Field, useToast } from '../../shared/ui';
import { authService } from './authService';
import { PasswordField } from './PasswordField';

/** RN-18 (D-19): la nueva contraseña tiene al menos 8 caracteres; la actual es obligatoria. Sin confirmación (spec). */
const PASSWORD_MIN = 8;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: 'Escribe tu contraseña actual.' }),
  newPassword: z.string().min(PASSWORD_MIN, { error: `La nueva contraseña debe tener al menos ${PASSWORD_MIN} caracteres.` }),
});

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const EMPTY: ChangePasswordValues = { currentPassword: '', newPassword: '' };

/**
 * `/account` (spec §9, F-09): cambio de contraseña propia. Las contraseñas solo viven en el estado del formulario:
 * no se guardan en el navegador ni se imprimen, y la mutación no queda en la caché (`gcTime: 0`).
 */
export function AccountPage() {
  const toast = useToast();
  const [formError, setFormError] = useState<ApiError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  const changePassword = useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordValues) =>
      authService.changePassword(currentPassword, newPassword),
    gcTime: 0,
  });

  const onSubmit = handleSubmit((values) => {
    if (changePassword.isPending) return;
    setFormError(null);
    changePassword.mutate(values, {
      onSuccess: () => {
        reset(EMPTY);
        toast.show({ tone: 'success', message: 'Tu contraseña se cambió correctamente.' });
      },
      onError: (error) => {
        const apiError = toApiError(error);
        if (apiError.code === 'INVALID_CURRENT_PASSWORD') {
          setError('currentPassword', { message: apiError.message }, { shouldFocus: true });
        } else {
          setFormError(apiError);
        }
      },
      // Quita las contraseñas de la mutación en cuanto termina.
      onSettled: () => changePassword.reset(),
    });
  });

  return (
    <section aria-labelledby="titulo-cuenta" className="mx-auto flex max-w-modal-sm flex-col gap-space-lg">
      <h1 id="titulo-cuenta" className="text-headline-lg text-ink">
        Mi cuenta
      </h1>
      <div className="rounded-lg border border-divider bg-surface-container-lowest p-margin shadow-elevated">
        <h2 className="text-headline-sm text-on-surface">Cambiar contraseña</h2>
        <p className="mt-space-xs mb-space-lg text-body-md text-on-surface-variant">
          Escribe tu contraseña actual y la nueva.
        </p>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-space-lg">
          {formError && (
            <Banner tone="error" requestId={formError.requestId}>
              {formError.message}
            </Banner>
          )}
          <Field label="Contraseña actual" error={errors.currentPassword?.message}>
            {(control) => <PasswordField {...control} autoComplete="current-password" {...register('currentPassword')} />}
          </Field>
          <Field
            label="Nueva contraseña"
            hint={`Al menos ${PASSWORD_MIN} caracteres.`}
            error={errors.newPassword?.message}
          >
            {(control) => <PasswordField {...control} autoComplete="new-password" {...register('newPassword')} />}
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={changePassword.isPending}>
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
