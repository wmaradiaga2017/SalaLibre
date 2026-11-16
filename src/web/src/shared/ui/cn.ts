/** Une clases de Tailwind e ignora los valores vacíos (sin dependencias). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
