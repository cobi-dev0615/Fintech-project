import { TrendingUp, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

interface WeeklyActivityData {
  totalTransactions: number;
  totalSpent: number;
  dailyAvg: number;
  byDay: Array<{ day: string; count: number; amount: number }>;
  activityTrend: number;
  spendingTrend: number;
}

interface WeeklyActivityCardProps {
  data: WeeklyActivityData | null;
  loading?: boolean;
}

const WeeklyActivityCard = ({ data, loading }: WeeklyActivityCardProps) => {
  const { t } = useTranslation(['dashboard']);
  const { formatCurrency } = useCurrency();

  if (loading || !data) {
    return (
      <div className="chart-card h-full">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.byDay.map(d => d.count), 1);

  // Reorder: MON first (backend sends SUN=0 first)
  const orderedDays = data.byDay.length === 7
    ? [...data.byDay.slice(1), data.byDay[0]]
    : data.byDay;

  return (
    <div className="chart-card h-full">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        {t('dashboard:analytics.weeklyActivity')}
      </h3>

      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{data.totalTransactions}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t('dashboard:analytics.totalTransactions')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(data.totalSpent)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t('dashboard:analytics.totalSpent')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{data.dailyAvg.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t('dashboard:analytics.dailyAvg')}</p>
        </div>
      </div>

      {/* Day circles */}
      <div className="flex items-end justify-between gap-2 mb-6">
        {orderedDays.map((day) => {
          const intensity = day.count / maxCount;
          return (
            <div key={day.day} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  intensity > 0.6
                    ? "bg-primary text-primary-foreground"
                    : intensity > 0.3
                    ? "bg-primary/40 text-foreground"
                    : intensity > 0
                    ? "bg-primary/20 text-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {day.count}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{day.day}</span>
            </div>
          );
        })}
      </div>

      {/* Trends */}
      <div className="flex items-center gap-6 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t('dashboard:analytics.activityTrend')}</span>
          {data.activityTrend >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className={cn(
            "text-xs font-medium tabular-nums",
            data.activityTrend >= 0 ? "text-success" : "text-destructive"
          )}>
            {data.activityTrend > 0 ? "+" : ""}{data.activityTrend}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t('dashboard:analytics.spendingTrend')}</span>
          {data.spendingTrend <= 0 ? (
            <TrendingDown className="h-3.5 w-3.5 text-success" />
          ) : (
            <TrendingUp className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className={cn(
            "text-xs font-medium tabular-nums",
            data.spendingTrend <= 0 ? "text-success" : "text-destructive"
          )}>
            {data.spendingTrend > 0 ? "+" : ""}{data.spendingTrend}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyActivityCard;
