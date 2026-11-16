import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useId } from 'react';
import { formatLongDate, formatShortDate } from '../../shared/datetime';
import { Button, cn } from '../../shared/ui';

interface DayPickerProps {
  /** Días permitidos (hoy … hoy + 30, solo L–V): no se puede elegir otro (CA2). */
  days: string[];
  value: string;
  onChange: (day: string) => void;
  today: string;
  /** Fechas con cierre, para marcarlas en la lista. */
  closedDates: ReadonlySet<string>;
}

const ARROW =
  'inline-flex size-9 items-center justify-center rounded-base border border-outline-variant bg-surface-container-lowest ' +
  'text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container';

/** Barra de fecha (prototipo de la agenda): día anterior y siguiente, lista de días y "Hoy". */
export function DayPicker({ days, value, onChange, today, closedDates }: DayPickerProps) {
  const id = useId();
  const index = days.indexOf(value);
  const prev = index > 0 ? days[index - 1] : undefined;
  const next = index >= 0 && index < days.length - 1 ? days[index + 1] : undefined;
  const todayIsOffered = days[0] === today;

  return (
    <div className="flex w-full flex-wrap items-center gap-space-sm sm:w-auto">
      <button
        type="button"
        className={ARROW}
        onClick={() => prev && onChange(prev)}
        disabled={!prev}
        aria-label="Día hábil anterior"
      >
        <ChevronLeft aria-hidden="true" size={18} />
      </button>
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <label htmlFor={id} className="sr-only">
          Día de la agenda
        </label>
        <CalendarDays
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute top-1/2 left-space-md -translate-y-1/2 text-primary-container"
        />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'h-9 w-full rounded-base sm:w-auto sm:min-w-64 border border-outline-variant bg-surface-container-lowest pr-8 pl-9',
            'text-headline-sm text-ink tnum transition-colors hover:border-outline',
            'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary-container',
          )}
        >
          {days.map((day) => (
            <option key={day} value={day}>
              {day === today ? `Hoy, ${formatLongDate(day)}` : formatLongDate(day)}
              {closedDates.has(day) ? ' · Cerrado' : ''}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className={ARROW}
        onClick={() => next && onChange(next)}
        disabled={!next}
        aria-label="Día hábil siguiente"
      >
        <ChevronRight aria-hidden="true" size={18} />
      </button>
      {todayIsOffered && (
        <Button variant="ghost" onClick={() => onChange(today)} disabled={value === today}>
          Volver a hoy
        </Button>
      )}
      <span className="sr-only" aria-live="polite">
        {formatShortDate(value)}
      </span>
    </div>
  );
}
