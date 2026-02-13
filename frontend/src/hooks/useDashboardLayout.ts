import { useState, useEffect, useCallback } from 'react';
import type { DashboardCard, StoredDashboardLayout } from '@/types/dashboard';

interface UseDashboardLayoutOptions {
  dashboardType: 'customer' | 'admin' | 'consultant' | 'customer-cards';
  userId: string;
  defaultCards: DashboardCard[];
}

interface UseDashboardLayoutReturn {
  cards: DashboardCard[];
  reorderCards: (activeId: string, overId: string) => void;
  resetToDefault: () => void;
  isLoading: boolean;
}

/**
 * Custom hook for managing dashboard card layout and persistence
 *
 * Features:
 * - Loads saved layout from localStorage
 * - Provides default layout for new users
 * - Handles card reordering
 * - Persists changes to localStorage
 * - Type-safe with dashboard types
 */
export function useDashboardLayout({
  dashboardType,
  userId,
  defaultCards,
}: UseDashboardLayoutOptions): UseDashboardLayoutReturn {
  const [cards, setCards] = useState<DashboardCard[]>(defaultCards);
  const [isLoading, setIsLoading] = useState(true);

  // Generate storage key
  const storageKey = `dashboard-layout-${dashboardType}-${userId}`;

  // Load saved layout and update when data changes
  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem(storageKey);

      if (savedLayout) {
        const parsed: StoredDashboardLayout = JSON.parse(savedLayout);

        // Reorder default cards based on saved order, preserving updated data
        const reorderedCards = parsed.cardOrder
          .map(cardId => defaultCards.find(c => c.id === cardId))
          .filter((card): card is DashboardCard => card !== undefined);

        // Add any new cards that weren't in the saved layout (for updates/new features)
        const newCards = defaultCards.filter(
          card => !parsed.cardOrder.includes(card.id)
        );

        setCards([...reorderedCards, ...newCards]);
      } else {
        // No saved layout, use defaults
        setCards(defaultCards);
      }
    } catch (error) {
      console.error('Error loading dashboard layout:', error);
      setCards(defaultCards);
    } finally {
      setIsLoading(false);
    }
  }, [dashboardType, userId, storageKey, defaultCards]);

  // Save current layout to localStorage
  const saveLayout = useCallback((cardsToSave: DashboardCard[]) => {
    try {
      const layout: StoredDashboardLayout = {
        userId,
        dashboardType,
        cardOrder: cardsToSave.map(c => c.id),
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch (error) {
      console.error('Error saving dashboard layout:', error);
    }
  }, [dashboardType, userId, storageKey]);

  // Reorder cards based on drag-and-drop
  const reorderCards = useCallback((activeId: string, overId: string) => {
    if (activeId === overId) return;

    setCards(prevCards => {
      const oldIndex = prevCards.findIndex(card => card.id === activeId);
      const newIndex = prevCards.findIndex(card => card.id === overId);

      if (oldIndex === -1 || newIndex === -1) return prevCards;

      // Create new array with reordered items
      const newCards = [...prevCards];
      const [movedCard] = newCards.splice(oldIndex, 1);
      newCards.splice(newIndex, 0, movedCard);

      // Update order property
      const updatedCards = newCards.map((card, index) => ({
        ...card,
        order: index,
      }));

      // Save to localStorage
      saveLayout(updatedCards);

      return updatedCards;
    });
  }, [saveLayout]);

  // Reset to default layout
  const resetToDefault = useCallback(() => {
    setCards(defaultCards);
    saveLayout(defaultCards);
  }, [defaultCards, saveLayout]);

  return {
    cards,
    reorderCards,
    resetToDefault,
    isLoading,
  };
}
