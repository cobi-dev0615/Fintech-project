import { Target, Calendar, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GoalCardProps {
  name: string;
  target: number;
  current: number;
  deadline: string | null;
  category: string;
}

export function GoalCard({ name, target, current, deadline, category }: GoalCardProps) {
  const { t } = useTranslation(['dashboard', 'common']);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(t('common:locale'), {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  const progress = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(t('common:locale'), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getDaysRemaining = (deadlineStr: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadlineStr);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = deadline ? getDaysRemaining(deadline) : null;

  return (
    <div className="kpi-card group cursor-default">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning transition-colors">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground capitalize">
              {category}
            </h3>
            <p className="text-xl font-bold text-foreground mt-1">
              {name}
            </p>
          </div>
        </div>
        {deadline && daysRemaining !== null && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            daysRemaining < 30
              ? 'bg-destructive/10 text-destructive'
              : daysRemaining < 90
              ? 'bg-warning/10 text-warning'
              : 'bg-success/10 text-success'
          }`}>
            <Calendar className="h-3 w-3" />
            {daysRemaining} {t('common:days', { defaultValue: 'days' })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border/40">
        {/* Progress Bar - Compact */}
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">
            {t('dashboard:progress', { defaultValue: 'Progress' })}
          </span>
          <span className="font-medium text-foreground">{progress.toFixed(1)}%</span>
        </div>
        <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden mb-3">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Compact Timeline */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground">{formatCurrency(current)}</span>
          </div>
          <div className="text-muted-foreground">
            {formatCurrency(remaining)} {t('dashboard:toGo', { defaultValue: 'to go' })}
          </div>
          <div>
            <span className="font-medium text-primary">{formatCurrency(target)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
