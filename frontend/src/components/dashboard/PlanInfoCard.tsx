import { CreditCard, Calendar, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from "@/contexts/CurrencyContext";

interface PlanInfoCardProps {
  planName: string;
  price: number;
  status: string;
  currentPeriodEnd: string;
}

export function PlanInfoCard({ planName, price, status, currentPeriodEnd }: PlanInfoCardProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { formatCurrency } = useCurrency();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(t('common:locale'), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const isActive = status === 'active';

  return (
    <div className="kpi-card group cursor-default">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            isActive ? 'bg-success/10 text-success' : 'bg-muted/20 text-muted-foreground'
          }`}>
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('dashboard:currentPlan', { defaultValue: 'Current Plan' })}
            </h3>
            <p className="text-2xl font-bold text-foreground mt-1">
              {planName}
            </p>
          </div>
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
            <Check className="h-3 w-3" />
            {t('common:active', { defaultValue: 'Active' })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{t('dashboard:renewsOn', { defaultValue: 'Renews on' })}</span>
          <span className="font-medium text-foreground">{formatDate(currentPeriodEnd)}</span>
        </div>
        <div className="text-lg font-bold text-primary">
          {formatCurrency(price / 100)}/
          <span className="text-sm font-normal text-muted-foreground">
            {t('common:month', { defaultValue: 'month' })}
          </span>
        </div>
      </div>
    </div>
  );
}
