import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from './cn';
import { ToastContext, type ToastInput, type ToastTone } from './toast-context';

/** Duración en pantalla. Los errores duran más para poder copiar el `requestId`. */
const DURATION: Record<ToastTone, number> = { success: 4000, info: 4000, error: 8000 };

const TONES: Record<ToastTone, { box: string; icon: ReactNode }> = {
  success: { box: 'border-available-outline', icon: <CircleCheck size={18} className="text-on-available-container" /> },
  error: { box: 'border-busy-outline', icon: <CircleAlert size={18} className="text-on-busy-container" /> },
  info: { box: 'border-primary-fixed-dim', icon: <Info size={18} className="text-primary-container" /> },
};

interface ToastItem extends Required<Pick<ToastInput, 'message'>> {
  id: number;
  tone: ToastTone;
  requestId?: string;
}

/**
 * Proveedor de avisos breves (toasts). Los anuncia una región `aria-live` que siempre está en el DOM: `polite` para
 * confirmaciones y `assertive` para errores. Se cierran solos o con la X.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    ({ tone = 'info', message, requestId }: ToastInput) => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, tone, message, requestId }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION[tone]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  const region = (tone: 'polite' | 'assertive') => (
    <div aria-live={tone} className="flex flex-col gap-space-sm">
      {items
        .filter((t) => (t.tone === 'error') === (tone === 'assertive'))
        .map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-80 items-start gap-space-sm rounded-lg border bg-surface-container-lowest px-gutter py-space-md shadow-modal',
              TONES[t.tone].box,
            )}
          >
            <span aria-hidden="true" className="mt-px shrink-0">
              {TONES[t.tone].icon}
            </span>
            <div className="flex-1 text-body-md text-on-surface">
              <p>{t.message}</p>
              {t.requestId && (
                <p className="mt-space-xs text-body-sm text-on-surface-variant">
                  Código de seguimiento: <code className="text-code-sm">{t.requestId}</code>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar aviso"
              className="rounded-base p-px text-on-surface-variant hover:bg-surface-container-low"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
    </div>
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-margin bottom-margin z-60 flex flex-col gap-space-sm">
        {region('polite')}
        {region('assertive')}
      </div>
    </ToastContext.Provider>
  );
}
