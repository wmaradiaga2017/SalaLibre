import type { ReactNode } from 'react';
import { cn } from './cn';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Acciones a la derecha (DESIGN.md, Componentes 6). */
  align?: 'left' | 'right';
  /** Fechas, horas y cifras con dígitos tabulares. */
  numeric?: boolean;
  /** Oculta el texto del encabezado (p. ej. columna de acciones), pero lo deja para lectores de pantalla. */
  hideHeader?: boolean;
}

interface TableProps<T> {
  /** Descripción de la tabla para lectores de pantalla. */
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
}

/** Tabla administrativa: superficie blanca, encabezado `label-xs` en mayúsculas y filas separadas por el borde. */
export function Table<T>({ caption, columns, rows, rowKey, className }: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-divider bg-surface-container-lowest', className)}>
      <table className="w-full border-collapse text-left text-body-md">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-mist">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'border-b border-divider px-gutter py-space-sm text-label-xs uppercase text-on-surface-variant',
                  c.align === 'right' && 'text-right',
                )}
              >
                <span className={cn(c.hideHeader && 'sr-only')}>{c.header}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-divider last:border-b-0 hover:bg-surface">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-gutter py-space-md align-middle text-on-surface',
                    c.align === 'right' && 'text-right',
                    c.numeric && 'tnum',
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
