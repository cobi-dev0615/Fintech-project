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
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning transition-colors">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground capitalize">
              {category}
            </h3>
            <p className="text-lg font-bold text-foreground mt-1">
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

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            {t('dashboard:progress', { defaultValue: 'Progress' })}
          </span>
          <span className="font-medium text-foreground">{progress.toFixed(1)}%</span>
        </div>
        <div className="relative h-2.5 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline with current position marker */}
      <div className="relative pt-4 border-t border-border/40">
        <div className="flex items-center justify-between text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {t('dashboard:current', { defaultValue: 'Current' })}
            </span>
            <span className="font-bold text-success">{formatCurrency(current)}</span>
          </div>
          <div className="flex flex-col items-center">
            <TrendingUp className="h-4 w-4 text-primary mb-1" />
            <span className="text-xs text-muted-foreground">
              {formatCurrency(remaining)} {t('dashboard:toGo', { defaultValue: 'to go' })}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">
              {t('dashboard:target', { defaultValue: 'Target' })}
            </span>
            <span className="font-bold text-primary">{formatCurrency(target)}</span>
          </div>
        </div>
        {deadline && (
          <div className="mt-3 text-center text-xs text-muted-foreground">
            {t('dashboard:deadline', { defaultValue: 'Deadline' })}: {formatDate(deadline)}
          </div>
        )}
      </div>
    </div>
  );
}
