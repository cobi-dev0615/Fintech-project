import { ReactNode } from 'react';

/**
 * Represents a single dashboard card configuration
 */
export interface DashboardCard {
  /** Unique identifier for the card (e.g., "net-worth", "total-cash") */
  id: string;

  /** Type of card - determines styling and layout behavior */
  type: 'kpi' | 'chart';

  /** The React component to render */
  component: ReactNode;

  /** Display order (0-indexed) */
  order: number;

  /** Optional grid span configuration for different screen sizes */
  span?: {
    mobile: number;   // 1-2 columns
    tablet: number;   // 1-2 columns
    desktop: number;  // 1-4 columns
  };

  /** Whether the card can be dragged (defaults to true) */
  draggable?: boolean;
}

/**
 * Dashboard layout configuration stored in localStorage
 */
export interface DashboardLayout {
  /** User ID who owns this layout */
  userId: string;

  /** Type of dashboard */
  dashboardType: 'customer' | 'admin' | 'consultant' | 'customer-cards';

  /** Array of cards in their custom order */
  cards: DashboardCard[];

  /** Timestamp of last update */
  lastUpdated: string;
}

/**
 * Simplified card data for storage (without React components)
 */
export interface StoredCardData {
  id: string;
  order: number;
}

/**
 * Stored layout (without React components, suitable for localStorage)
 */
export interface StoredDashboardLayout {
  userId: string;
  dashboardType: 'customer' | 'admin' | 'consultant' | 'customer-cards';
  cardOrder: string[];  // Array of card IDs in order
  lastUpdated: string;
}
