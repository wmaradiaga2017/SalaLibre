import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarX2, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toApiError, type ApiError } from '../../shared/apiClient';
import { addDays, formatLongDate, localDate, useNow } from '../../shared/datetime';
import { Banner, Button, ErrorState, Field, Input, Modal, Spinner, useToast } from '../../shared/ui';
import { useBookings } from '../bookings/agenda-queries';
import { bookingsLabel, cancelledMessage, closureErrorField, closureSchema, type ClosureFormValues } from './closure-form';
import { useCreateClosure } from './closures-queries';
import { CLOSURE_LIMITS } from './types';

interface ClosureFormModalProps {
  onClose: () => void;
}

/**
 * Registrar un día cerrado (spec §9, F-07; T10b CA2–CA4) en dos pasos dentro del mismo modal: (1) fecha y motivo;
 * (2) confirmación con cuántas reservas se cancelarán, contadas con `GET /bookings?date=` (F-07 paso 2). Al confirmar,
 * `POST /closures`; el aviso usa `cancelledBookings` de la respuesta. `CLOSURE_EXISTS` y `CLOSURE_IN_PAST` vuelven al
 * paso 1 con el mensaje en el campo de la fecha.
 */
export function ClosureFormModal({ onClose }: ClosureFormModalProps) {
  const toast = useToast();
  const formId = useId();
  const today = localDate(useNow());
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [values, setValues] = useState<ClosureFormValues | null>(null);
  const [formError, setFormError] = useState<ApiError | null>(null);
  // Error del API para la fecha: se aplica cuando el paso 1 vuelve a estar montado (para poder enfocar el campo).
  const dateError = useRef<string | null>(null);
  const createClosure = useCreateClosure();
  const pending = createClosure.isPending;

  // El esquema depende de "hoy" en `BUSINESS_TZ`.
  const resolver = useMemo<Resolver<ClosureFormValues>>(
    () => (v, context, options) => zodResolver(closureSchema(today))(v, context, options),
    [today],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ClosureFormValues>({ resolver, defaultValues: { date: '', reason: '' } });

  useEffect(() => {
    if (step !== 'form' || dateError.current === null) return;
    setError('date', { message: dateError.current }, { shouldFocus: true });
    dateError.current = null;
  }, [step, setError]);

  const toConfirm = handleSubmit((v) => {
    setFormError(null);
    setValues(v);
    setStep('confirm');
  });

  const onSubmitForm = (event: FormEvent<HTMLFormElement>) => void toConfirm(event);

  // Candado síncrono contra el doble envío (B-141): un doble clic en "Cerrar el día" no manda dos `POST`.
  const locked = useRef(false);

  const confirm = () => {
    if (!values || locked.current) return;
    locked.current = true;
    createClosure.mutate(values, {
      onSuccess: (created) => {
        toast.show({
          tone: 'success',
          message: `${formatLongDate(created.date)} quedó cerrado. ${cancelledMessage(created.cancelledBookings)}`,
        });
        onClose();
      },
      onError: (error) => {
        const apiError = toApiError(error);
        const field = closureErrorField(apiError);
        if (field === 'date') dateError.current = apiError.message;
        else setFormError(apiError);
        setStep('form');
      },
      onSettled: () => {
        locked.current = false;
      },
    });
  };

  return (
    <Modal
      open
      size="md"
      onClose={onClose}
      title={step === 'form' ? 'Nuevo día cerrado' : 'Confirmar el cierre'}
      description={
        step === 'form' ? 'Ese día nadie podrá reservar ninguna sala y se cancelarán sus reservas confirmadas.' : undefined
      }
      dismissible={!pending}
      footer={
        step === 'form' ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form={formId}>
              Continuar
            </Button>
          </>
        ) : (
          <ConfirmFooter
            date={values?.date ?? ''}
            pending={pending}
            onBack={() => setStep('form')}
            onConfirm={confirm}
          />
        )
      }
    >
      {step === 'form' ? (
        <form id={formId} noValidate onSubmit={onSubmitForm} className="flex flex-col gap-gutter">
          {formError && (
            <Banner tone="error" requestId={formError.requestId}>
              {formError.message}
            </Banner>
          )}
          <Field label="Fecha" required error={errors.date?.message} hint="Un día posterior a hoy.">
            {(p) => (
              <div className="max-w-56">
                <Input {...p} type="date" min={addDays(today, 1)} className="tnum" {...register('date')} />
              </div>
            )}
          </Field>
          <Field
            label="Motivo"
            required
            error={errors.reason?.message}
            hint={`Se muestra en la agenda. Hasta ${CLOSURE_LIMITS.reasonMax} caracteres.`}
          >
            {(p) => <Input {...p} autoComplete="off" placeholder="Por ejemplo: Nochebuena" {...register('reason')} />}
          </Field>
        </form>
      ) : (
        values && <ConfirmSummary date={values.date} reason={values.reason} />
      )}
    </Modal>
  );
}

/** Paso 2: fecha, motivo y cuántas reservas se cancelarán (CA2). Pide las reservas de nuevo al montarse. */
function ConfirmSummary({ date, reason }: { date: string; reason: string }) {
  const bookings = useBookings(date, { fresh: true });

  let warning;
  if (bookings.isError) {
    const error = toApiError(bookings.error);
    warning = (
      <ErrorState
        message={`No se pudo saber cuántas reservas se cancelarán. ${error.message}`}
        requestId={error.requestId}
        onRetry={() => void bookings.refetch()}
        retrying={bookings.isFetching}
      />
    );
  } else if (bookings.isPending) {
    warning = (
      <p className="flex items-center gap-space-sm text-body-md text-on-surface-variant">
        <Spinner size={16} label="Contando reservas" /> Contando las reservas de ese día…
      </p>
    );
  } else {
    const count = bookings.data.length;
    warning = (
      <Banner tone={count > 0 ? 'error' : 'info'}>
        {count > 0 ? (
          <>
            {count === 1 ? 'Se cancelará ' : 'Se cancelarán '}
            <strong className="tnum">{bookingsLabel(count)}</strong>
            {count === 1 ? ' confirmada' : ' confirmadas'} de ese día, en todas las salas. No se pueden restaurar.
          </>
        ) : (
          'No hay reservas confirmadas ese día: no se cancelará ninguna.'
        )}
      </Banner>
    );
  }

  return (
    <div className="flex flex-col gap-gutter">
      <dl className="grid grid-cols-[auto_1fr] gap-x-space-lg gap-y-space-sm text-body-md">
        <dt className="text-on-surface-variant">Fecha</dt>
        <dd className="flex items-center gap-space-sm text-ink">
          <CalendarX2 aria-hidden="true" size={16} className="text-on-surface-variant" />
          {formatLongDate(date)}
        </dd>
        <dt className="text-on-surface-variant">Motivo</dt>
        <dd className="break-words text-ink">{reason}</dd>
      </dl>
      <div aria-live="polite">{warning}</div>
    </div>
  );
}

/** Pie del paso 2: "Cerrar el día" solo cuando ya se sabe cuántas reservas se cancelarán. */
function ConfirmFooter({
  date,
  pending,
  onBack,
  onConfirm,
}: {
  date: string;
  pending: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const bookings = useBookings(date, { fresh: true });
  const counted = bookings.isSuccess && !bookings.isFetching;
  return (
    <>
      <Button variant="secondary" onClick={onBack} disabled={pending}>
        Volver
      </Button>
      <Button
        variant="danger"
        icon={<TriangleAlert size={16} />}
        onClick={onConfirm}
        loading={pending}
        disabled={!counted}
      >
        Cerrar el día
      </Button>
    </>
  );
}
