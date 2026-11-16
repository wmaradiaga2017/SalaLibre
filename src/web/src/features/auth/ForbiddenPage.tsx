import { ShieldX } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../../shared/ui';

/** Estado "Sin permiso" (spec §9). */
export function ForbiddenPage() {
  return (
    <EmptyState
      icon={<ShieldX size={32} />}
      title="No tienes permiso para ver esta página"
      action={
        <Link
          to="/agenda"
          className="rounded-base text-label-md text-primary-container underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
        >
          Ir a la agenda
        </Link>
      }
    />
  );
}
