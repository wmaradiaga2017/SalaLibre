/** Iniciales de un nombre: primera letra de las dos primeras palabras ("Empleado Uno" → "EU"). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase('es') ?? '')
    .join('');
}
