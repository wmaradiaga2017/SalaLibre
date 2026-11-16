import { useEffect, useState } from 'react';

/**
 * Instante actual que se renueva cada `intervalMs` (por defecto, un minuto). Lo usa la agenda para la línea de hora
 * actual y para dejar de ofrecer los huecos que ya pasaron.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
