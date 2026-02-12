import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface SortableCardProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  draggable?: boolean;
}

/**
 * Sortable card wrapper component
 *
 * Features:
 * - Adds drag handle icon in upper right corner (if draggable)
 * - Handle appears on hover (desktop) or always visible (mobile)
 * - Visual feedback during drag (opacity, scale, shadow)
 * - Cursor changes: grab → grabbing
 * - Accessible with keyboard navigation and screen readers
 * - Can be disabled with draggable prop
 */
export function SortableCard({ id, children, className, draggable = true }: SortableCardProps) {
  const { t } = useTranslation('dashboard');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'z-50 opacity-50 scale-105',
        className
      )}
    >
      {/* Drag Handle - only show if draggable */}
      {draggable && (
        <button
          type="button"
          className={cn(
            'drag-handle absolute top-3 right-3 z-10',
            'cursor-grab active:cursor-grabbing',
            'text-muted-foreground/40 hover:text-muted-foreground/80',
            'transition-all duration-200',
            'opacity-0 group-hover:opacity-100',
            'focus:opacity-100 focus:outline-none',
            'rounded-md p-1',
            // Always visible on touch devices
            'touch-none',
            '@media (hover: none) { opacity-60 }'
          )}
          {...attributes}
          {...listeners}
          aria-label={t('dragHandle', { defaultValue: 'Drag to reorder' })}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {/* Card Content */}
      {children}
    </div>
  );
}
