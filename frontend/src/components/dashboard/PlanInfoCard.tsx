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
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
          isActive ? 'bg-success/10 text-success' : 'bg-muted/20 text-muted-foreground'
        }`}>
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-muted-foreground truncate">
              {t('dashboard:currentPlan', { defaultValue: 'Current Plan' })}
            </h3>
            {isActive && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium shrink-0">
                <Check className="h-3 w-3" />
                {t('common:active', { defaultValue: 'Active' })}
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-foreground mt-1 truncate">
            {planName}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="truncate">{t('dashboard:renewsOn', { defaultValue: 'Renews on' })} <span className="font-medium text-foreground">{formatDate(currentPeriodEnd)}</span></span>
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
