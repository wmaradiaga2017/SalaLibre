import { Users, X } from 'lucide-react';
import { useId } from 'react';
import { Button, CheckboxGroup, Input } from '../../shared/ui';
import { hasFilters, NO_FILTERS, type RoomFilterValue } from './agenda-logic';
import { EQUIPMENT_ICONS } from '../rooms/equipment-icons';
import { EQUIPMENT, EQUIPMENT_LABELS, type Equipment } from './types';

const EQUIPMENT_OPTIONS = EQUIPMENT.map((e) => ({ value: e, label: EQUIPMENT_LABELS[e], icon: EQUIPMENT_ICONS[e] }));

/** Capacidad de una sala: entero entre 1 y 100 (RN-22). */
const CAPACITY_MAX = 100;

interface RoomFiltersProps {
  value: RoomFilterValue;
  onChange: (value: RoomFilterValue) => void;
}

/**
 * Barra rápida de filtros (D-25, DESIGN.md Componentes 3): capacidad mínima y equipos requeridos. Filtra en el cliente
 * las columnas de la agenda (F-02 paso 2); no llama al API.
 */
export function RoomFilters({ value, onChange }: RoomFiltersProps) {
  const capacityId = useId();

  const onCapacity = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    onChange({ ...value, minCapacity: raw === '' || Number.isNaN(n) || n < 1 ? null : Math.min(n, CAPACITY_MAX) });
  };

  return (
    <div className="flex flex-wrap items-end gap-x-space-lg gap-y-space-sm">
      <div className="flex flex-col gap-space-xs">
        <label htmlFor={capacityId} className="text-label-md text-on-surface">
          Capacidad mínima
        </label>
        <div className="relative w-44">
          <Users
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute top-1/2 left-space-md -translate-y-1/2 text-on-surface-variant"
          />
          <Input
            id={capacityId}
            type="number"
            inputMode="numeric"
            min={1}
            max={CAPACITY_MAX}
            step={1}
            placeholder="Cualquiera"
            value={value.minCapacity ?? ''}
            onChange={(e) => onCapacity(e.target.value)}
            className="h-9 pl-9 tnum"
          />
        </div>
      </div>
      <CheckboxGroup
        legend="Equipamiento"
        options={EQUIPMENT_OPTIONS}
        value={value.equipment}
        onChange={(equipment) => onChange({ ...value, equipment: equipment as Equipment[] })}
      />
      {hasFilters(value) && (
        <Button variant="ghost" icon={<X size={16} />} onClick={() => onChange(NO_FILTERS)}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
