import { Lock, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscription, PLAN_HIERARCHY, PlanCode } from '@/contexts/SubscriptionContext';

interface UpgradePromptProps {
  feature: string;
  requiredPlan?: PlanCode;
  /** "inline" shows a smaller card, "page" shows a full-page centered prompt */
  variant?: 'inline' | 'page';
}

const PLAN_DISPLAY: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: 'text-muted-foreground' },
  basic: { label: 'Basic', color: 'text-blue-500' },
  pro: { label: 'Pro', color: 'text-purple-500' },
  consultant: { label: 'Consultant', color: 'text-amber-500' },
  enterprise: { label: 'Enterprise', color: 'text-emerald-500' },
};

const UpgradePrompt = ({ feature, requiredPlan, variant = 'page' }: UpgradePromptProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('plans');
  const { planCode, getRequiredPlan } = useSubscription();

  const needed = requiredPlan || getRequiredPlan(feature);
  const currentDisplay = PLAN_DISPLAY[planCode] || PLAN_DISPLAY.free;
  const neededDisplay = PLAN_DISPLAY[needed] || PLAN_DISPLAY.basic;

  const plansPath = location.pathname.startsWith('/consultant')
    ? '/consultant/plans'
    : '/app/plans';

  if (variant === 'inline') {
    return (
      <div className="chart-card flex items-center gap-4 p-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t('upgrade.featureRequires', { plan: neededDisplay.label })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('upgrade.currentPlanIs', { plan: currentDisplay.label })}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate(plansPath)}>
          {t('upgrade.upgradeCta')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="chart-card max-w-md w-full text-center p-8 space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            {t('upgrade.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('upgrade.description', { feature: t(`upgrade.features.${feature}`, { defaultValue: feature }) })}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 py-2">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('upgrade.yourPlan')}</p>
            <span className={`font-semibold ${currentDisplay.color}`}>
              {currentDisplay.label}
            </span>
          </div>
          <ArrowUpCircle className="h-5 w-5 text-primary" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('upgrade.requiredPlan')}</p>
            <span className={`font-semibold ${neededDisplay.color}`}>
              {neededDisplay.label}
            </span>
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={() => navigate(plansPath)}>
          <ArrowUpCircle className="h-4 w-4 mr-2" />
          {t('upgrade.viewPlans')}
        </Button>
      </div>
    </div>
  );
};

export default UpgradePrompt;
