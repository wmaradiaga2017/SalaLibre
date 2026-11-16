/**
 * Conversión entre instantes UTC y fecha y hora locales de una zona IANA, con `Intl` (sin dependencias, D-07, D-21).
 * No fija desfases a mano: sirve para cualquier `BUSINESS_TZ`, con o sin horario de verano.
 */

export interface LocalDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 1 = lunes … 7 = domingo (ISO 8601). */
  weekday: number;
  /** Fecha local `AAAA-MM-DD`. */
  date: string;
  /** Minutos desde las 00:00 locales. */
  minutesOfDay: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** Fecha y hora locales de `instant` en `timeZone`. */
export function toLocal(instant: Date, timeZone: string): LocalDateTime {
  const parts: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') {
      parts[part.type] = Number(part.value);
    }
  }
  const { year, month, day, hour, minute, second } = parts;
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = domingo
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday: utcDay === 0 ? 7 : utcDay,
    date: `${pad(year, 4)}-${pad(month)}-${pad(day)}`,
    minutesOfDay: hour * 60 + minute,
  };
}

/** Fecha local `AAAA-MM-DD` de `instant` en `timeZone`. */
export function localDate(instant: Date, timeZone: string): string {
  return toLocal(instant, timeZone).date;
}

/** Desfase de la zona en ese instante, en milisegundos (hora local − UTC). */
function offsetMs(instant: number, timeZone: string): number {
  const l = toLocal(new Date(instant), timeZone);
  const asUtc = Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute, l.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Instante UTC en que empieza el día local `date` (`AAAA-MM-DD`) en `timeZone`. */
export function startOfLocalDay(date: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const guess = Date.UTC(year, month - 1, day);
  let result = guess - offsetMs(guess, timeZone);
  const corrected = guess - offsetMs(result, timeZone); // por si el desfase cambia ese día
  if (corrected !== result) {
    result = corrected;
  }
  return new Date(result);
}

/** `date` (`AAAA-MM-DD`) más `days` días de calendario. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** `true` si `date` es una fecha de calendario real con formato `AAAA-MM-DD`. */
export function isCalendarDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}
