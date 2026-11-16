import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { toApiError } from '../../shared/apiClient';
import { formatLongDate, formatMinutes, localDate, localMinutes, zonedInstant } from '../../shared/datetime';
import { Banner, Button, Field, Input, Modal, Select, useToast } from '../../shared/ui';
import { bookingErrorInfo } from './booking-errors';
import {
  bookingSchema,
  defaultEnd,
  endOptions,
  START_OPTIONS,
  TITLE_MAX,
  type BookingFormValues,
} from './booking-form';
import type { Room } from './types';
import { useCreateBooking } from './useCreateBooking';

export interface SlotSelection {
  roomId: string;
  startAt: Date;
}

interface BookingFormModalProps {
  /** Hueco elegido en la agenda: sala e inicio precargados (CA1). */
  slot: SlotSelection;
  /** Salas que se pueden elegir (las activas de la agenda). */
  rooms: Room[];
  onClose: () => void;
}

/**
 * Formulario de reserva en modal de 480 px (spec §9, F-02 pasos 3–7; DESIGN.md Componentes 4): sala, inicio y fin en
 * pasos de 15 min, título y asistentes, con la capacidad visible. Los errores del API van a su campo o al banner con
 * el `requestId` (CA3–CA5). Mientras se envía, no se puede reenviar ni cerrar (CA6).
 */
export function BookingFormModal({ slot, rooms, onClose }: BookingFormModalProps) {
  const toast = useToast();
  const formId = useId();
  const date = localDate(slot.startAt);
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null);
  const createBooking = useCreateBooking();

  const capacityOf = useMemo(() => {
    const byId = new Map(rooms.map((r) => [r.id, r.capacity]));
    return (roomId: string) => byId.get(roomId);
  }, [rooms]);

  // El esquema depende de la capacidad de la sala elegida (RN-07).
  const resolver = useMemo<Resolver<BookingFormValues>>(
    () => (values, context, options) => zodResolver(bookingSchema(capacityOf(values.roomId)))(values, context, options),
    [capacityOf],
  );

  const start = localMinutes(slot.startAt);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    setValue,
    control,
    getValues,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver,
    defaultValues: {
      roomId: slot.roomId,
      start: String(start),
      end: String(defaultEnd(start)),
      title: '',
      attendees: 1,
    },
  });

  // Foco inicial en el título (CA7). Este efecto corre después del de `Modal`, que enfoca el primer control.
  useEffect(() => setFocus('title'), [setFocus]);

  const roomId = useWatch({ control, name: 'roomId' });
  const startValue = Number(useWatch({ control, name: 'start' }));
  const capacity = capacityOf(roomId);
  const ends = useMemo(() => endOptions(startValue), [startValue]);

  const onStartChange = (value: string) => {
    const s = Number(value);
    const e = Number(getValues('end'));
    if (!(e > s && endOptions(s).some((o) => Number(o.value) === e))) setValue('end', String(defaultEnd(s)));
  };

  // Candado síncrono contra el doble envío (CA6): `handleSubmit` valida de forma asíncrona, así que `isPending` sigue en
  // `false` si llegan varios clics antes de que se llame a `mutate`. Se toma antes de validar y se suelta al terminar.
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

  const send = (values: BookingFormValues) => {
    setFormError(null);
    const s = Number(values.start);
    const e = Number(values.end);
    const roomName = rooms.find((r) => r.id === values.roomId)?.name ?? 'la sala';
    createBooking.mutate(
      {
        roomId: values.roomId,
        startAt: zonedInstant(date, s).toISOString(),
        endAt: zonedInstant(date, e).toISOString(),
        title: values.title,
        attendees: values.attendees,
      },
      {
        onSuccess: () => {
          toast.show({
            tone: 'success',
            message: `Reserva creada: ${roomName}, ${formatLongDate(date)}, ${formatMinutes(s)}–${formatMinutes(e)}.`,
          });
          onClose();
        },
        onError: (error) => {
          const apiError = toApiError(error);
          const info = bookingErrorInfo(apiError);
          if (info.field) {
            setError(info.field, { message: info.message }, { shouldFocus: true });
          } else {
            setFormError({ message: info.message, requestId: apiError.requestId });
          }
        },
        onSettled: release,
      },
    );
  };

  const roomOptions = rooms.map((r) => ({ value: r.id, label: `${r.name} · ${r.capacity} pax` }));

  return (
    <Modal
      open
      onClose={onClose}
      title="Nueva reserva"
      dismissible={!createBooking.isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={createBooking.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={createBooking.isPending}>
            Reservar
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

        <p className="flex items-center gap-space-sm text-body-md text-on-surface">
          <CalendarDays aria-hidden="true" size={18} className="text-primary-container" />
          {formatLongDate(date)}
        </p>

        <Field
          label="Sala"
          required
          error={errors.roomId?.message}
          hint={capacity !== undefined ? `Capacidad: ${capacity} personas` : undefined}
        >
          {(p) => <Select {...p} options={roomOptions} {...register('roomId')} />}
        </Field>

        <div className="grid grid-cols-2 gap-gutter">
          <Field label="Inicio" required error={errors.start?.message}>
            {(p) => (
              <Select
                {...p}
                className="tnum"
                options={START_OPTIONS}
                {...register('start', { onChange: (e) => onStartChange(e.target.value) })}
              />
            )}
          </Field>
          <Field label="Fin" required error={errors.end?.message}>
            {(p) => <Select {...p} className="tnum" options={ends} {...register('end')} />}
          </Field>
        </div>

        <Field label="Título" required error={errors.title?.message} hint={`Hasta ${TITLE_MAX} caracteres.`}>
          {(p) => <Input {...p} autoComplete="off" {...register('title')} />}
        </Field>

        <Field
          label="Asistentes"
          required
          error={errors.attendees?.message}
          hint={capacity !== undefined ? `Máximo ${capacity}.` : undefined}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={1}
              max={capacity}
              step={1}
              className="tnum"
              {...register('attendees', { valueAsNumber: true })}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}

