/** Componentes base de la interfaz (T07a). Las pantallas importan desde `shared/ui`, no desde cada archivo. */
export { Avatar } from './Avatar';
export { Badge, type BadgeTone } from './Badge';
export { Banner, type BannerTone } from './Banner';
export { Button, type ButtonVariant } from './Button';
export { CheckboxGroup, type CheckboxOption } from './CheckboxGroup';
export { cn } from './cn';
export { ConfirmDialog } from './ConfirmDialog';
export { Field, type FieldControlProps } from './Field';
export { initials } from './initials';
export { Input, Select, type SelectOption } from './Input';
export { Modal } from './Modal';
export { Skeleton, Spinner } from './Spinner';
export { EmptyState, ErrorState } from './States';
export { Table, type Column } from './Table';
export { ToastProvider } from './Toast';
export { useToast, type ToastInput, type ToastTone } from './toast-context';
