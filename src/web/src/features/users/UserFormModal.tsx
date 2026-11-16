import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useRef, useState, type FormEvent } from 'react';
import { useForm, type FieldValues, type UseFormHandleSubmit } from 'react-hook-form';
import { toApiError, type ApiError } from '../../shared/apiClient';
import { Banner, Button, Field, Input, Modal, Select, useToast } from '../../shared/ui';
import { PasswordField } from '../auth/PasswordField';
import { ROLE_LABELS, ROLES, USER_LIMITS, type User } from './types';
import {
  createUserSchema,
  editUserSchema,
  EMPTY_USER,
  userChanges,
  userErrorField,
  type CreateUserValues,
  type EditUserValues,
} from './user-form';
import { useCreateUser, useUpdateUser } from './users-queries';

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

interface UserFormModalProps {
  /** Usuario a editar; sin él, el modal da de alta uno nuevo. */
  user?: User;
  /** Id del `ADMIN` con sesión (para recargar su sesión si se edita a sí mismo). */
  currentUserId?: string;
  onClose: () => void;
}

/**
 * Alta o edición de un usuario (spec §9 y F-06; T10a CA2 y CA3) en un modal de 640 px. Activar, desactivar y
 * restablecer la contraseña son acciones de la tabla.
 */
export function UserFormModal({ user, currentUserId, onClose }: UserFormModalProps) {
  return user ? (
    <EditUserForm user={user} currentUserId={currentUserId} onClose={onClose} />
  ) : (
    <CreateUserForm onClose={onClose} />
  );
}

/**
 * Candado síncrono contra el doble envío (B-141): `handleSubmit` valida de forma asíncrona y `isPending` llega tarde.
 * Se toma antes de validar y se suelta al terminar (o si la validación falla).
 */
function useSubmitLock<T extends FieldValues>(handleSubmit: UseFormHandleSubmit<T>, send: (values: T, release: () => void) => void) {
  const locked = useRef(false);
  const release = () => {
    locked.current = false;
  };
  return (event: FormEvent<HTMLFormElement>) => {
    if (locked.current) {
      event.preventDefault();
      return;
    }
    locked.current = true;
    void handleSubmit((values) => send(values, release), release)(event);
  };
}

/**
 * Alta (CA2): nombre, correo, contraseña inicial y rol. La contraseña solo vive en el formulario: la mutación no queda
 * en la caché (`gcTime: 0` y `reset()`) y el modal se desmonta al terminar (CA7). `EMAIL_TAKEN` va al campo del correo.
 */
function CreateUserForm({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const formId = useId();
  const [formError, setFormError] = useState<ApiError | null>(null);
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateUserValues>({ resolver: zodResolver(createUserSchema), defaultValues: EMPTY_USER });

  const onSubmit = useSubmitLock(handleSubmit, (values, release) => {
    setFormError(null);
    createUser.mutate(values, {
      onSuccess: (created) => {
        toast.show({ tone: 'success', message: `Usuario creado: ${created.name} (${created.email}).` });
        onClose();
      },
      onError: (error) => {
        const apiError = toApiError(error);
        const field = userErrorField(apiError);
        if (field) setError(field, { message: apiError.message }, { shouldFocus: true });
        else setFormError(apiError);
      },
      onSettled: () => {
        // Quita la contraseña de la mutación en cuanto termina (T07b).
        createUser.reset();
        release();
      },
    });
  });

  const pending = createUser.isPending;

  return (
    <Modal
      open
      size="md"
      onClose={onClose}
      title="Nuevo usuario"
      description="Entrega la contraseña inicial a la persona: podrá cambiarla en Mi cuenta."
      dismissible={!pending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            Crear usuario
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
        <Field label="Nombre" required error={errors.name?.message} hint={`Hasta ${USER_LIMITS.nameMax} caracteres.`}>
          {(p) => <Input {...p} autoComplete="off" {...register('name')} />}
        </Field>
        <Field label="Correo" required error={errors.email?.message} hint="Se guarda en minúsculas.">
          {(p) => <Input {...p} type="email" autoComplete="off" spellCheck={false} {...register('email')} />}
        </Field>
        <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2">
          <Field
            label="Contraseña inicial"
            required
            error={errors.password?.message}
            hint={`Al menos ${USER_LIMITS.passwordMin} caracteres.`}
          >
            {(p) => <PasswordField {...p} autoComplete="new-password" {...register('password')} />}
          </Field>
          <Field label="Rol" required error={errors.role?.message}>
            {(p) => <Select {...p} options={ROLE_OPTIONS} {...register('role')} />}
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/** Edición (CA3): solo nombre y rol; el correo se muestra sin poder editarse. Solo se envían los campos cambiados. */
function EditUserForm({ user, currentUserId, onClose }: { user: User; currentUserId?: string; onClose: () => void }) {
  const toast = useToast();
  const formId = useId();
  const [formError, setFormError] = useState<ApiError | null>(null);
  const updateUser = useUpdateUser(currentUserId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: user.name, role: user.role },
  });

  const onSubmit = useSubmitLock(handleSubmit, (values, release) => {
    setFormError(null);
    const changes = userChanges(user, values);
    if (Object.keys(changes).length === 0) {
      // Sin cambios no se llama al API (no deja una fila de auditoría vacía).
      release();
      onClose();
      return;
    }
    updateUser.mutate(
      { id: user.id, changes },
      {
        onSuccess: (updated) => {
          toast.show({ tone: 'success', message: `Usuario actualizado: ${updated.name}.` });
          onClose();
        },
        onError: (error) => setFormError(toApiError(error)),
        onSettled: release,
      },
    );
  });

  const pending = updateUser.isPending;

  return (
    <Modal
      open
      size="md"
      onClose={onClose}
      title={`Editar ${user.name}`}
      dismissible={!pending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            Guardar cambios
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
        <Field label="Correo" hint="El correo no se puede cambiar.">
          {(p) => <Input {...p} type="email" value={user.email} readOnly disabled />}
        </Field>
        <Field label="Nombre" required error={errors.name?.message} hint={`Hasta ${USER_LIMITS.nameMax} caracteres.`}>
          {(p) => <Input {...p} autoComplete="off" {...register('name')} />}
        </Field>
        <Field label="Rol" required error={errors.role?.message}>
          {(p) => <Select {...p} options={ROLE_OPTIONS} {...register('role')} />}
        </Field>
      </form>
    </Modal>
  );
}
