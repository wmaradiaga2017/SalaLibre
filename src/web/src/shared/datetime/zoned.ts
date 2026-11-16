/**
 * Fechas y horas en la zona del negocio (D-07, D-21). La API guarda y devuelve instantes UTC; la interfaz siempre
 * los muestra en `BUSINESS_TZ`. Se calcula con `Intl`, sin librerías ni desfases fijos (como `common/time` del API).
 *
 * Una "fecha" es un día de calendario en texto `AAAA-MM-DD` (como `Closure.date` y `GET /bookings?date=`); un
 * "instante" es un `Date` o un ISO con zona.
 */

/** Valor por defecto de `BUSINESS_TZ` (spec §5). El frontend no recibe la configuración del API. */
export const BUSINESS_TZ = 'America/Tegucigalpa';

const MS_PER_MINUTE = 60_000;

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function toLocalParts(instant: Date): LocalParts {
  const parts: Record<string, number> = {};
  for (const p of partsFormatter.formatToParts(instant)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local (`AAAA-MM-DD`) de un instante en `BUSINESS_TZ`. */
export function localDate(instant: Date): string {
  const p = toLocalParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutos desde la medianoche local de un instante (0–1439). */
export function localMinutes(instant: Date): number {
  const p = toLocalParts(instant);
  return p.hour * 60 + p.minute;
}

/** Hora local `HH:MM` de un instante. */
export function formatTime(instant: Date): string {
  const p = toLocalParts(instant);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Minutos del día en texto `HH:MM` (p. ej. 420 → `07:00`). */
export function formatMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function parseDate(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

/** Suma días de calendario a una fecha `AAAA-MM-DD` (aritmética de calendario, sin zona). */
export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Día de la semana de una fecha: 0 = domingo … 6 = sábado. */
export function weekday(date: string): number {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Lunes a viernes (RN-04). */
export function isWeekday(date: string): boolean {
  const d = weekday(date);
  return d >= 1 && d <= 5;
}

/** Diferencia en minutos entre la hora local de `BUSINESS_TZ` y UTC en un instante. */
function offsetMinutes(instantMs: number): number {
  const p = toLocalParts(new Date(instantMs));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instantMs / 1000) * 1000) / MS_PER_MINUTE);
}

/**
 * Instante que corresponde a una fecha local y unos minutos desde su medianoche en `BUSINESS_TZ`
 * (p. ej. `2026-11-16` + 600 → `2026-11-16T16:00:00Z` en Tegucigalpa, UTC-6).
 */
export function zonedInstant(date: string, minutes: number): Date {
  const { year, month, day } = parseDate(date);
  const guess = Date.UTC(year, month - 1, day, 0, minutes);
  let result = guess - offsetMinutes(guess) * MS_PER_MINUTE;
  // Segunda pasada por si el desfase cambia entre la suposición y el resultado (horario de verano).
  result = guess - offsetMinutes(result) * MS_PER_MINUTE;
  return new Date(result);
}

const longDayFormatter = new Intl.DateTimeFormat('es-HN', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortDayFormatter = new Intl.DateTimeFormat('es-HN', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function dateAsUtc(date: string): Date {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day));
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Lunes, 16 de noviembre de 2026". */
export function formatLongDate(date: string): string {
  return capitalize(longDayFormatter.format(dateAsUtc(date)));
}

/** "Lun, 16 nov". */
export function formatShortDate(date: string): string {
  return capitalize(shortDayFormatter.format(dateAsUtc(date)).replace(/\./g, ''));
}

/** Duración legible: 15 → "15 min", 60 → "1 h", 90 → "1 h 30 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

