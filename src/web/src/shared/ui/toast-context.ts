import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  tone?: ToastTone;
  message: string;
  /** Request ID de un error del API (D-06). */
  requestId?: string;
}

export interface ToastApi {
  show: (toast: ToastInput) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Muestra avisos breves (confirmaciones y errores). Requiere `<ToastProvider>` más arriba en el árbol. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error('useToast necesita un <ToastProvider>');
  }
  return api;
}
