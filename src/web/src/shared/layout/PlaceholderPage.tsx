import type { ReactNode } from 'react';
import { Banner } from '../ui';

interface PlaceholderPageProps {
  title: string;
  /** Título del aviso. */
  notice: string;
  /** Explicación del aviso. */
  children?: ReactNode;
}

/**
 * Página de una sección que existe en la navegación pero no tiene pantalla. Hoy solo la usa `/admin/audit`, porque
 * T10c se recortó (D-34): muestra un aviso en lugar de una pantalla vacía.
 */
export function PlaceholderPage({ title, notice, children }: PlaceholderPageProps) {
  return (
    <section aria-labelledby="titulo-pagina" className="mx-auto flex max-w-5xl flex-col gap-space-lg">
      <h1 id="titulo-pagina" className="text-headline-lg text-ink">
        {title}
      </h1>
      <Banner tone="info" title={notice}>
        {children}
      </Banner>
    </section>
  );
}
