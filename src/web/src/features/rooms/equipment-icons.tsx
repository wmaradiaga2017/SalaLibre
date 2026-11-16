import { Presentation, Projector, Tv, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Equipment } from './types';

/** Icono de cada equipo (DESIGN.md, Componentes 3: icono y texto). Siempre decorativo: va junto a su etiqueta. */
export const EQUIPMENT_ICONS: Record<Equipment, ReactNode> = {
  PROJECTOR: <Projector size={14} />,
  VIDEOCONF: <Video size={14} />,
  WHITEBOARD: <Presentation size={14} />,
  TV: <Tv size={14} />,
};
