import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { subscriptionsApi, PlanFeatures } from '@/lib/api-subscriptions';
import { useAuth } from '@/hooks/useAuth';

type PlanCode = 'free' | 'basic' | 'pro' | 'consultant' | 'enterprise';

interface PlanInfo {
  id: string;
  code: PlanCode;
  name: string;
  priceCents: number;
}

interface Subscription {
  id: string;
  status: string;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  plan: PlanInfo;
}

interface SubscriptionContextValue {
  subscription: Subscription | null;
  planCode: PlanCode;
  features: PlanFeatures;
  isLoading: boolean;
  /** Check if a feature is accessible (not blocked) */
  canAccess: (featureCode: string) => boolean;
  /** Get the limit for a feature (null = unlimited, 0 = blocked, >0 = max) */
  getLimit: (featureCode: string) => number | null;
  /** Get the minimum plan required for a feature */
  getRequiredPlan: (featureCode: string) => PlanCode;
  /** Refresh subscription data */
  refresh: () => Promise<void>;
}

const PLAN_HIERARCHY: PlanCode[] = ['free', 'basic', 'pro', 'consultant', 'enterprise'];

/** Maps feature codes to the minimum plan that grants access */
const FEATURE_MIN_PLAN: Record<string, PlanCode> = {
  connections: 'free',
  reports: 'basic',
  goals: 'free',
  ai: 'pro',
  alerts: 'pro',
  b3: 'basic',
  calculators: 'free',
  messages: 'basic',
  clients: 'consultant',
  pipeline: 'consultant',
  invitations: 'consultant',
  simulator: 'consultant',
  whitelabel: 'consultant',
  api_access: 'enterprise',
};

const DEFAULT_FREE_FEATURES: PlanFeatures = {
  connections: 1,
  reports: 0,
  goals: 1,
  ai: 0,
  alerts: 0,
  b3: 0,
  calculators: 1,
  messages: 0,
  clients: 0,
  pipeline: 0,
  invitations: 0,
  simulator: 0,
  whitelabel: 0,
  api_access: 0,
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [features, setFeatures] = useState<PlanFeatures>(DEFAULT_FREE_FEATURES);
  const [planCode, setPlanCode] = useState<PlanCode>('free');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setFeatures(DEFAULT_FREE_FEATURES);
      setPlanCode('free');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await subscriptionsApi.getMySubscription();

      if (response.subscription) {
        setSubscription(response.subscription as Subscription);
        const code = (response.subscription.plan.code || 'free') as PlanCode;
        setPlanCode(code);
        // Use features from subscription or top-level fallback
        const feats = response.subscription.features || response.features || DEFAULT_FREE_FEATURES;
        setFeatures(feats);
      } else {
        setSubscription(null);
        setPlanCode((response.planCode as PlanCode) || 'free');
        setFeatures(response.features || DEFAULT_FREE_FEATURES);
      }
    } catch {
      // On error, default to free
      setSubscription(null);
      setFeatures(DEFAULT_FREE_FEATURES);
      setPlanCode('free');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const canAccess = useCallback((featureCode: string): boolean => {
    const limit = features[featureCode];
    // undefined means feature not defined → allow (graceful degradation)
    if (limit === undefined) return true;
    // null means unlimited
    if (limit === null) return true;
    // 0 means blocked
    if (limit === 0) return false;
    // > 0 means allowed (limit exists but access granted)
    return true;
  }, [features]);

  const getLimit = useCallback((featureCode: string): number | null => {
    const limit = features[featureCode];
    if (limit === undefined) return null; // not defined → unlimited
    return limit;
  }, [features]);

  const getRequiredPlan = useCallback((featureCode: string): PlanCode => {
    return FEATURE_MIN_PLAN[featureCode] || 'basic';
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        planCode,
        features,
        isLoading,
        canAccess,
        getLimit,
        getRequiredPlan,
        refresh: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

export { PLAN_HIERARCHY };
export type { PlanCode, PlanInfo, Subscription };
