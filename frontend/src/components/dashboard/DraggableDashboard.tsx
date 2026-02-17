import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { DashboardCard } from '@/types/dashboard';
import { SortableCard } from './SortableCard';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { useAuth } from '@/hooks/useAuth';

interface DraggableDashboardProps {
  dashboardType: 'customer' | 'admin' | 'consultant' | 'customer-cards';
  defaultCards: DashboardCard[];
  className?: string;
}

/**
 * Main draggable dashboard wrapper component
 *
 * Features:
 * - Sets up DndContext with sensors for mouse, touch, and keyboard
 * - Uses SortableContext for grid-based sorting
 * - Handles drag events and card reordering
 * - Auto-saves layout to localStorage
 * - Maintains responsive grid (2-4 columns based on screen size)
 */
export function DraggableDashboard({
  dashboardType,
  defaultCards,
  className,
}: DraggableDashboardProps) {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for drag interactions
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance to activate (prevents accidental drags)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Touch-and-hold delay for mobile
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Use custom hook for layout management
  const { cards, reorderCards, isLoading } = useDashboardLayout({
    dashboardType,
    userId: user?.id || 'guest',
    defaultCards,
  });

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderCards(active.id as string, over.id as string);
    }

    setActiveId(null);
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {defaultCards.map(card => (
          <div
            key={card.id}
            className={cn(
              'animate-pulse bg-card/50 rounded-xl border border-border/60',
              card.span?.desktop === 4 && 'lg:col-span-4',
              card.span?.desktop === 2 && 'lg:col-span-2'
            )}
            style={{ minHeight: card.type === 'chart' ? '400px' : '120px' }}
          />
        ))}
      </div>
    );
  }

  // Get the active card for drag overlay
  const activeCard = activeId ? cards.find(card => card.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={cards.map(c => c.id)} strategy={rectSortingStrategy}>
        <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
          {cards.map(card => (
            <SortableCard
              key={card.id}
              id={card.id}
              draggable={card.draggable !== false}
              className={cn(
                card.type === 'chart' && !card.span?.desktop && 'lg:col-span-4',
                card.span?.desktop === 1 && 'lg:col-span-1',
                card.span?.desktop === 2 && 'lg:col-span-2',
                card.span?.desktop === 3 && 'lg:col-span-3',
                card.span?.desktop === 4 && 'lg:col-span-4',
                card.span?.mobile === 1 && 'col-span-1',
                card.span?.mobile === 2 && 'col-span-2'
              )}
            >
              {card.component}
            </SortableCard>
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay - Shows the dragged item */}
      <DragOverlay>
        {activeCard ? (
          <div className="opacity-80 scale-105 shadow-2xl border-2 border-primary rounded-xl">
            {activeCard.component}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
