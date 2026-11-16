import { EmptyState } from '../ui';

/** Marcador de una ruta cuyo contenido llega en una tarea posterior (T07: solo rutas y navegación). */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section aria-labelledby="titulo-pagina" className="mx-auto flex max-w-5xl flex-col gap-space-lg">
      <h1 id="titulo-pagina" className="text-headline-lg text-ink">
        {title}
      </h1>
      <div className="rounded-lg border border-divider bg-surface-container-lowest">
        <EmptyState title="Pantalla en construcción" />
      </div>
    </section>
  );
}
