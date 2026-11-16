import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { toApiError, type ApiError } from '../../shared/apiClient';
import { Banner, Button, Field, Modal, useToast } from '../../shared/ui';
import { PasswordField } from '../auth/PasswordField';
import { USER_LIMITS, type User } from './types';
import { resetPasswordSchema, type ResetPasswordValues } from './user-form';
import { useResetPassword } from './users-queries';

interface ResetPasswordModalProps {
  user: User;
  onClose: () => void;
}

/**
 * Restablecer la contraseña de un usuario (F-06 paso 4, D-19; T10a CA5 y CA7). La nueva contraseña solo vive en el
 * formulario: la mutación usa `gcTime: 0` y `reset()`, y el modal se desmonta al terminar. No se muestra en el aviso.
 */
export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const toast = useToast();
  const formId = useId();
  const [formError, setFormError] = useState<ApiError | null>(null);
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { newPassword: '' } });

  // Foco inicial en la contraseña (el `Modal` enfoca antes el primer control).
  useEffect(() => setFocus('newPassword'), [setFocus]);

  // Candado síncrono contra el doble envío (B-141).
  const locked = useRef(false);
  const release = () => {
    locked.current = false;
  };

  const send = ({ newPassword }: ResetPasswordValues) => {
    setFormError(null);
    resetPassword.mutate(
      { id: user.id, newPassword },
      {
        onSuccess: () => {
          toast.show({ tone: 'success', message: `Contraseña restablecida para ${user.name}.` });
          onClose();
        },
        onError: (error) => setFormError(toApiError(error)),
        onSettled: () => {
          resetPassword.reset();
          release();
        },
      },
    );
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (locked.current) {
      event.preventDefault();
      return;
    }
    locked.current = true;
    void handleSubmit(send, release)(event);
  };

  const pending = resetPassword.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title="Restablecer contraseña"
      description={`${user.name} · ${user.email}`}
      dismissible={!pending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            Restablecer
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-gutter">
        {formError && (
          <Banner tone="error" requestId={formError.requestId}>
            {formError.message}
          </Banner>
        )}
        <Field
          label="Nueva contraseña"
          required
          error={errors.newPassword?.message}
          hint={`Al menos ${USER_LIMITS.passwordMin} caracteres. Entrégala a la persona: podrá cambiarla en Mi cuenta.`}
        >
          {(p) => <PasswordField {...p} autoComplete="new-password" {...register('newPassword')} />}
        </Field>
      </form>
    </Modal>
  );
}
