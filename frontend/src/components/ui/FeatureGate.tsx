import { ReactNode } from 'react';
import { useSubscription, PlanCode } from '@/contexts/SubscriptionContext';
import UpgradePrompt from './UpgradePrompt';

interface FeatureGateProps {
  /** The feature code to check (e.g., 'ai', 'reports', 'b3') */
  feature: string;
  /** Override the required plan (otherwise auto-detected from feature code) */
  requiredPlan?: PlanCode;
  /** Content to show when the feature is accessible */
  children: ReactNode;
  /** Custom fallback instead of the default UpgradePrompt */
  fallback?: ReactNode;
  /** "inline" shows a smaller prompt, "page" shows a full-page prompt */
  variant?: 'inline' | 'page';
}

/**
 * Wraps content that requires a specific plan feature.
 * Shows an upgrade prompt when the user's plan doesn't include the feature.
 */
const FeatureGate = ({
  feature,
  requiredPlan,
  children,
  fallback,
  variant = 'page',
}: FeatureGateProps) => {
  const { canAccess, isLoading } = useSubscription();

  // While loading subscription data, show children (no flash of upgrade prompt)
  if (isLoading) return null;

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <UpgradePrompt feature={feature} requiredPlan={requiredPlan} variant={variant} />;
};

export default FeatureGate;
