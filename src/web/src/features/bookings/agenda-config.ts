/**
 * Medidas de la agenda. Los valores de negocio son los por defecto del spec §5 (el frontend no recibe la
 * configuración del API); las medidas visuales son las de DESIGN.md («Arquitectura de la línea de tiempo»).
 */

/** `BUSINESS_OPEN_TIME` 07:00 y `BUSINESS_CLOSE_TIME` 20:00, en minutos desde la medianoche (RN-04, D-09). */
export const OPEN_MINUTES = 7 * 60;
export const CLOSE_MINUTES = 20 * 60;

/** `BOOKING_SLOT_MINUTES` (RN-02). */
export const SLOT_MINUTES = 15;

/** `BOOKING_MAX_DAYS_AHEAD` (RN-06): el selector ofrece de hoy a hoy + 30. */
export const MAX_DAYS_AHEAD = 30;

/** 64 px por hora → 16 px por franja de 15 min. */
export const HOUR_HEIGHT_PX = 64;
export const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;

/** Eje de horas de 64 px y columnas de sala de 180 px como mínimo. */
export const TIME_AXIS_WIDTH_PX = 64;
export const ROOM_COLUMN_MIN_PX = 180;

/** Las reservas de menos de 30 min usan la tarjeta compacta (DESIGN.md, Componentes 1). */
export const COMPACT_CARD_BELOW_MINUTES = 30;

/** Inicios de franja del día: 07:00, 07:15 … 19:45 (52 franjas). */
export const SLOT_STARTS: readonly number[] = Array.from(
  { length: (CLOSE_MINUTES - OPEN_MINUTES) / SLOT_MINUTES },
  (_, i) => OPEN_MINUTES + i * SLOT_MINUTES,
);

export const GRID_HEIGHT_PX = (CLOSE_MINUTES - OPEN_MINUTES) * PX_PER_MINUTE;
