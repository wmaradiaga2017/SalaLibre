import { useEffect, useState, type RefObject } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** `true` si la persona pidió reducir el movimiento (CA16). Se actualiza si cambia la preferencia. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_MOTION).matches);

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/**
 * T07c · Seguimiento del cursor (CA8, CA9): escribe `--look-x` y `--look-y` (de -1 a 1) en el propio SVG, y el CSS
 * las convierte en un desplazamiento pequeño de las pupilas. Un solo listener de puntero y un `requestAnimationFrame`
 * pendiente como máximo; ambos se cancelan al desactivarse o al desmontar (CA14). Sin consultas globales al DOM.
 */
export function useCharacterLook(target: RefObject<SVGSVGElement | null>, enabled: boolean): void {
  useEffect(() => {
    const element = target.current;
    if (!element) return;

    const reset = () => {
      element.style.setProperty('--look-x', '0');
      element.style.setProperty('--look-y', '0');
    };

    if (!enabled) {
      reset();
      return;
    }

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const update = () => {
      frame = 0;
      if (!pointer) return;
      const rect = element.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 3;
      element.style.setProperty('--look-x', clamp((pointer.x - cx) / (rect.width / 2)).toFixed(3));
      element.style.setProperty('--look-y', clamp((pointer.y - cy) / (rect.height / 2)).toFixed(3));
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (frame) cancelAnimationFrame(frame);
      reset();
    };
  }, [target, enabled]);
}
