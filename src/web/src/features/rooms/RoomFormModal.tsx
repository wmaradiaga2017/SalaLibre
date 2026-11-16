import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toApiError, type ApiError } from '../../shared/apiClient';
import { Banner, Button, CheckboxGroup, Field, Input, Modal, useToast } from '../../shared/ui';
import { EQUIPMENT_ICONS } from './equipment-icons';
import { EMPTY_ROOM, roomChanges, roomErrorField, roomSchema, roomToValues, toRoomInput, type RoomFormValues } from './room-form';
import { useCreateRoom, useUpdateRoom } from './rooms-queries';
import { EQUIPMENT, EQUIPMENT_LABELS, ROOM_LIMITS, type Room } from './types';

const EQUIPMENT_OPTIONS = EQUIPMENT.map((e) => ({ value: e, label: EQUIPMENT_LABELS[e], icon: EQUIPMENT_ICONS[e] }));

interface RoomFormModalProps {
  /** Sala a editar; sin ella, el modal crea una nueva. */
  room?: Room;
  onClose: () => void;
}

/**
 * Crear o editar una sala (spec §9 y F-05; T10 CA2, CA3, CA5 y CA6) en un modal de 640 px (DESIGN.md, formularios de
 * administración). Al editar solo se envían los campos que cambiaron. `ROOM_NAME_TAKEN` va al campo del nombre; cualquier
 * otro error, al banner con su `requestId`. Activar y desactivar no van aquí: son una acción de la tabla.
 */
export function RoomFormModal({ room, onClose }: RoomFormModalProps) {
  const toast = useToast();
  const formId = useId();
  const editing = room !== undefined;
  const [formError, setFormError] = useState<ApiError | null>(null);
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const pending = createRoom.isPending || updateRoom.isPending;

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: room ? roomToValues(room) : EMPTY_ROOM,
  });

  // Candado síncrono contra el doble envío (B-141): `handleSubmit` valida de forma asíncrona y `isPending` llega tarde.
  const submitting = useRef(false);
  const release = () => {
    submitting.current = false;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (submitting.current) {
      event.preventDefault();
      return;
    }
    submitting.current = true;
    void handleSubmit(send, release)(event);
  };

  const onError = (error: unknown) => {
    const apiError = toApiError(error);
    const field = roomErrorField(apiError);
    if (field) setError(field, { message: apiError.message }, { shouldFocus: true });
    else setFormError(apiError);
  };

  const send = (values: RoomFormValues) => {
    setFormError(null);
    if (!room) {
      createRoom.mutate(toRoomInput(values), {
        onSuccess: (created) => {
          toast.show({ tone: 'success', message: `Sala creada: ${created.name}.` });
          onClose();
        },
        onError,
        onSettled: release,
      });
      return;
    }
    const changes = roomChanges(room, values);
    if (Object.keys(changes).length === 0) {
      // Sin cambios no se llama al API (no deja una fila de auditoría vacía).
      release();
      onClose();
      return;
    }
    updateRoom.mutate(
      { id: room.id, changes },
      {
        onSuccess: (updated) => {
          toast.show({ tone: 'success', message: `Sala actualizada: ${updated.name}.` });
          onClose();
        },
        onError,
        onSettled: release,
      },
    );
  };

  return (
    <Modal
      open
      size="md"
      onClose={onClose}
      title={editing ? `Editar ${room.name}` : 'Nueva sala'}
      description={editing ? undefined : 'La sala queda activa y disponible en la agenda.'}
      dismissible={!pending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {editing ? 'Guardar cambios' : 'Crear sala'}
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

        <Field label="Nombre" required error={errors.name?.message} hint={`Único, hasta ${ROOM_LIMITS.nameMax} caracteres.`}>
          {(p) => <Input {...p} autoComplete="off" {...register('name')} />}
        </Field>

        <div className="grid grid-cols-1 gap-gutter sm:grid-cols-[10rem_1fr]">
          <Field
            label="Capacidad"
            required
            error={errors.capacity?.message}
            hint={`De ${ROOM_LIMITS.capacityMin} a ${ROOM_LIMITS.capacityMax} personas.`}
          >
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                min={ROOM_LIMITS.capacityMin}
                max={ROOM_LIMITS.capacityMax}
                step={1}
                className="tnum"
                {...register('capacity', { valueAsNumber: true })}
              />
            )}
          </Field>
          <Field label="Ubicación" required error={errors.location?.message} hint="Por ejemplo: Piso 2.">
            {(p) => <Input {...p} autoComplete="off" {...register('location')} />}
          </Field>
        </div>

        <Controller
          control={control}
          name="equipment"
          render={({ field }) => (
            <CheckboxGroup
              legend="Equipamiento"
              options={EQUIPMENT_OPTIONS}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              error={errors.equipment?.message}
            />
          )}
        />
      </form>
    </Modal>
  );
}
