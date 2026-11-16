/**
 * Parámetros de negocio de spec §5 ("Parámetros configurables"), tipados y validados al arrancar.
 * Sin dependencias de Nest: el dominio recibe este objeto. Los valores por defecto son los del spec
 * (el compose también los declara con `${VAR:-valor}`).
 */
export interface BusinessConfig {
  /** `BUSINESS_TZ` (D-21): zona IANA en la que se interpretan todas las horas. */
  timeZone: string;
  /** `BUSINESS_OPEN_TIME` en minutos desde las 00:00 (07:00 → 420). */
  openMinutes: number;
  /** `BUSINESS_CLOSE_TIME` en minutos desde las 00:00 (20:00 → 1200). */
  closeMinutes: number;
  /** `BOOKING_SLOT_MINUTES` (RN-02). */
  slotMinutes: number;
  /** `BOOKING_MIN_MINUTES` (RN-03). */
  minMinutes: number;
  /** `BOOKING_MAX_MINUTES` (RN-03). */
  maxMinutes: number;
  /** `BOOKING_MAX_DAYS_AHEAD` (RN-06). */
  maxDaysAhead: number;
}

export const BUSINESS_CONFIG = Symbol('BUSINESS_CONFIG');

const DEFAULTS = {
  BUSINESS_TZ: 'America/Tegucigalpa',
  BUSINESS_OPEN_TIME: '07:00',
  BUSINESS_CLOSE_TIME: '20:00',
  BOOKING_SLOT_MINUTES: '15',
  BOOKING_MIN_MINUTES: '15',
  BOOKING_MAX_MINUTES: '240',
  BOOKING_MAX_DAYS_AHEAD: '30',
} as const;

type Env = Record<string, string | undefined>;

function read(env: Env, name: keyof typeof DEFAULTS): string {
  const value = env[name]?.trim();
  return value ? value : DEFAULTS[name];
}

function timeOfDay(env: Env, name: 'BUSINESS_OPEN_TIME' | 'BUSINESS_CLOSE_TIME'): number {
  const value = read(env, name);
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new Error(`${name} debe tener el formato HH:MM (recibido: "${value}")`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function positiveInt(env: Env, name: keyof typeof DEFAULTS): number {
  const value = read(env, name);
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    throw new Error(`${name} debe ser un entero mayor que 0 (recibido: "${value}")`);
  }
  return Number(value);
}

/** Lee y valida la configuración. Lanza al arrancar si algún valor no es válido. */
export function loadBusinessConfig(env: Env = process.env): BusinessConfig {
  const timeZone = read(env, 'BUSINESS_TZ');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw new Error(`BUSINESS_TZ no es una zona horaria IANA válida (recibido: "${timeZone}")`);
  }

  const config: BusinessConfig = {
    timeZone,
    openMinutes: timeOfDay(env, 'BUSINESS_OPEN_TIME'),
    closeMinutes: timeOfDay(env, 'BUSINESS_CLOSE_TIME'),
    slotMinutes: positiveInt(env, 'BOOKING_SLOT_MINUTES'),
    minMinutes: positiveInt(env, 'BOOKING_MIN_MINUTES'),
    maxMinutes: positiveInt(env, 'BOOKING_MAX_MINUTES'),
    maxDaysAhead: positiveInt(env, 'BOOKING_MAX_DAYS_AHEAD'),
  };

  if (config.openMinutes >= config.closeMinutes) {
    throw new Error('BUSINESS_OPEN_TIME debe ser anterior a BUSINESS_CLOSE_TIME');
  }
  if (config.minMinutes > config.maxMinutes) {
    throw new Error('BOOKING_MIN_MINUTES no puede ser mayor que BOOKING_MAX_MINUTES');
  }
  if (60 % config.slotMinutes !== 0) {
    throw new Error('BOOKING_SLOT_MINUTES debe dividir la hora en partes iguales (5, 10, 15, 20, 30 o 60)');
  }
  return config;
}
