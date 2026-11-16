import { KeyRound, Pencil, Power, PowerOff, UserPlus, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { toApiError } from '../../shared/apiClient';
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Skeleton,
  Table,
  useToast,
  type Column,
} from '../../shared/ui';
import { useAuth } from '../auth/auth-context';
import { ResetPasswordModal } from './ResetPasswordModal';
import { ROLE_LABELS, type User } from './types';
import { UserFormModal } from './UserFormModal';
import { useUpdateUser, useUsers } from './users-queries';

/** Qué modal está abierto. */
type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; user: User }
  | { kind: 'reset'; user: User }
  | { kind: 'deactivate'; user: User }
  | null;

/**
 * `/admin/users` (spec §9, F-06; T10a): tabla con todos los usuarios ordenados por nombre (lo hace el API), alta y
 * edición en modal, restablecer contraseña y desactivar (con aviso de RN-15) o activar. Sin filtros, paginación ni
 * borrado (CA7, D-08). Del prototipo de Stitch solo se toman la tabla, las insignias Activo/Inactivo y el alta en modal.
 */
export function AdminUsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const users = useUsers();
  const updateUser = useUpdateUser(me?.id);
  const [dialog, setDialog] = useState<Dialog>(null);
  // Candado síncrono para activar/desactivar (B-141).
  const toggling = useRef(false);

  const setActive = (user: User, isActive: boolean) => {
    if (toggling.current) return;
    toggling.current = true;
    updateUser.mutate(
      { id: user.id, changes: { isActive } },
      {
        onSuccess: (updated) => {
          toast.show({
            tone: 'success',
            message: isActive
              ? `${updated.name} está activo y puede volver a entrar. Sus reservas canceladas no se restauran.`
              : `${updated.name} quedó inactivo y sus reservas futuras se cancelaron.`,
          });
          setDialog(null);
        },
        onError: (error) => {
          // CA6: p. ej. 422 `CANNOT_DEACTIVATE_SELF`, con el mensaje del API.
          const apiError = toApiError(error);
          setDialog(null);
          toast.show({ tone: 'error', message: apiError.message, requestId: apiError.requestId });
        },
        onSettled: () => {
          toggling.current = false;
        },
      },
    );
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (u) => (
        <span className="flex items-center gap-space-sm">
          <Avatar name={u.name} size="md" />
          <span className="text-label-md text-ink">
            {u.name}
            {u.id === me?.id && <span className="text-body-sm text-on-surface-variant"> (tú)</span>}
          </span>
        </span>
      ),
    },
    { key: 'email', header: 'Correo', render: (u) => <span className="break-all">{u.email}</span> },
    { key: 'role', header: 'Rol', render: (u) => ROLE_LABELS[u.role] },
    {
      key: 'status',
      header: 'Estado',
      render: (u) => (
        <Badge tone={u.isActive ? 'available' : 'maintenance'} dot>
          {u.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      hideHeader: true,
      align: 'right',
      render: (u) => {
        const self = u.id === me?.id;
        return (
          <div className="flex justify-end gap-space-xs">
            <Button
              variant="ghost"
              icon={<Pencil size={16} />}
              aria-label={`Editar ${u.name}`}
              onClick={() => setDialog({ kind: 'edit', user: u })}
            >
              Editar
            </Button>
            <Button
              variant="ghost"
              icon={<KeyRound size={16} />}
              aria-label={`Restablecer la contraseña de ${u.name}`}
              onClick={() => setDialog({ kind: 'reset', user: u })}
            >
              Restablecer contraseña
            </Button>
            {u.isActive ? (
              <Button
                variant="ghost"
                icon={<PowerOff size={16} />}
                aria-label={self ? 'No puedes desactivar tu propia cuenta' : `Desactivar ${u.name}`}
                title={self ? 'No puedes desactivar tu propia cuenta' : undefined}
                disabled={self}
                onClick={() => setDialog({ kind: 'deactivate', user: u })}
              >
                Desactivar
              </Button>
            ) : (
              <Button
                variant="ghost"
                icon={<Power size={16} />}
                aria-label={`Activar ${u.name}`}
                loading={updateUser.isPending && updateUser.variables?.id === u.id}
                onClick={() => setActive(u, true)}
              >
                Activar
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  let content;
  if (users.isError) {
    const error = toApiError(users.error);
    content = (
      <ErrorState
        message={error.message}
        requestId={error.requestId}
        onRetry={() => void users.refetch()}
        retrying={users.isFetching}
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else if (users.isPending) {
    content = <UsersSkeleton />;
  } else if (users.data.length === 0) {
    content = (
      <EmptyState
        title="No hay usuarios registrados"
        icon={<Users size={32} />}
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else {
    content = <Table caption="Usuarios" columns={columns} rows={users.data} rowKey={(u) => u.id} />;
  }

  const active = users.data?.filter((u) => u.isActive).length ?? 0;
  const inactive = (users.data?.length ?? 0) - active;

  return (
    <section aria-labelledby="titulo-usuarios" className="flex flex-col gap-space-md">
      <div className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex flex-wrap items-center gap-space-md">
            <h1 id="titulo-usuarios" className="text-headline-lg text-ink">
              Usuarios
            </h1>
            {users.isSuccess && users.data.length > 0 && (
              <Badge tone="primary">
                <span className="tnum">{active}</span> {active === 1 ? 'activo' : 'activos'}
                {inactive > 0 && (
                  <>
                    {' · '}
                    <span className="tnum">{inactive}</span> {inactive === 1 ? 'inactivo' : 'inactivos'}
                  </>
                )}
              </Badge>
            )}
          </div>
          <p className="text-body-md text-on-surface-variant">
            Las personas inactivas no pueden entrar y sus reservas futuras se cancelan al desactivarlas.
          </p>
        </div>
        <Button icon={<UserPlus size={16} />} onClick={() => setDialog({ kind: 'create' })}>
          Nuevo usuario
        </Button>
      </div>

      <div aria-busy={users.isFetching} aria-live="polite" className="sr-only">
        {users.isPending ? 'Cargando los usuarios' : ''}
      </div>

      {content}

      {dialog?.kind === 'create' && <UserFormModal onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && (
        <UserFormModal user={dialog.user} currentUserId={me?.id} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'reset' && <ResetPasswordModal user={dialog.user} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog?.kind === 'deactivate'}
        title={dialog?.kind === 'deactivate' ? `¿Desactivar a ${dialog.user.name}?` : ''}
        confirmLabel="Desactivar usuario"
        loading={updateUser.isPending}
        onConfirm={() => dialog?.kind === 'deactivate' && setActive(dialog.user, false)}
        onCancel={() => setDialog(null)}
      >
        <p>No podrá entrar y su sesión abierta dejará de funcionar.</p>
        <p className="mt-space-sm">
          <strong className="text-ink">Se cancelarán todas sus reservas futuras.</strong> Las que ya empezaron se
          mantienen.
        </p>
        <p className="mt-space-sm text-on-surface-variant">
          Si lo vuelves a activar, las reservas canceladas no se restauran.
        </p>
      </ConfirmDialog>
    </section>
  );
}

/** Esqueleto de la tabla mientras carga (spec §9, Cargando). */
function UsersSkeleton() {
  return (
    <div className="flex flex-col gap-space-sm rounded-lg border border-divider bg-surface-container-lowest p-gutter">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
