import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartCard from "./ChartCard";
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

/** Generates an SVG area-path from an array of numeric values */
const Sparkline = ({ values, color, height = 48 }: { values: number[]; color: string; height?: number }) => {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const width = 160;
  const pad = 2;
  const h = height - pad * 2;
  const step = (width - pad * 2) / (values.length - 1);

  const points = values.map((v, i) => ({
    x: pad + i * step,
    y: pad + h - (v / max) * h,
  }));

  // Build smooth line path
  let linePath = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cx = (points[i - 1].x + points[i].x) / 2;
    linePath += ` C ${cx},${points[i - 1].y} ${cx},${points[i].y} ${points[i].x},${points[i].y}`;
  }

  // Close for area fill
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

const formatCompact = (value: number): string => {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
};

const WeeklyActivityCard = ({ data, loading }: WeeklyActivityCardProps) => {
  const { t } = useTranslation(['dashboard']);
  const { formatCurrency } = useCurrency();

  if (loading || !data) {
    return (
      <ChartCard title={t('dashboard:analytics.weeklyActivity')}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ChartCard>
    );
  }

  const maxCount = Math.max(...data.byDay.map(d => d.count), 1);

  // Reorder: MON first (backend sends SUN=0 first)
  const orderedDays = data.byDay.length === 7
    ? [...data.byDay.slice(1), data.byDay[0]]
    : data.byDay;

  // Sparkline data from daily counts/amounts
  const activityValues = orderedDays.map(d => d.count);
  const spendingValues = orderedDays.map(d => d.amount);

  // Build cumulative for a nicer trend line
  const cumulativeActivity = activityValues.reduce<number[]>((acc, v) => {
    acc.push((acc[acc.length - 1] || 0) + v);
    return acc;
  }, []);
  const cumulativeSpending = spendingValues.reduce<number[]>((acc, v) => {
    acc.push((acc[acc.length - 1] || 0) + v);
    return acc;
  }, []);

  return (
    <ChartCard
      title={t('dashboard:analytics.weeklyActivity')}
      actions={
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Download className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{data.totalTransactions}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t('dashboard:analytics.totalTransactions')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">${formatCompact(data.totalSpent)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t('dashboard:analytics.totalSpent')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{data.dailyAvg.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t('dashboard:analytics.dailyAvg')}</p>
        </div>
      </div>

      {/* Day indicators — rounded rectangles */}
      <div className="grid grid-cols-7 gap-1.5 mb-5">
        {orderedDays.map((day) => {
          const intensity = day.count / maxCount;
          return (
            <div key={day.day} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-colors",
                  intensity > 0.6
                    ? "bg-primary text-primary-foreground"
                    : intensity > 0.3
                    ? "bg-primary/50 text-foreground"
                    : intensity > 0
                    ? "bg-primary/20 text-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {day.count}
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">{day.day}</span>
            </div>
          );
        })}
      </div>

      {/* Trend cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Activity Trend */}
        <div className="rounded-xl bg-card/60 border border-white/10 p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground font-medium">{t('dashboard:analytics.activityTrend')}</span>
            <div className="flex items-center gap-1">
              {data.activityTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={cn(
                "text-[11px] font-semibold tabular-nums",
                data.activityTrend >= 0 ? "text-success" : "text-destructive"
              )}>
                {data.activityTrend > 0 ? "+" : ""}{data.activityTrend}%
              </span>
            </div>
          </div>
          <div className="flex-1 mb-2">
            <Sparkline values={cumulativeActivity} color="#3b82f6" height={44} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground tabular-nums leading-tight">{data.totalTransactions}</p>
            <p className="text-[10px] text-muted-foreground">{t('dashboard:transactions', { defaultValue: 'Transactions' })}</p>
          </div>
        </div>

        {/* Spending Trend */}
        <div className="rounded-xl bg-card/60 border border-white/10 p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground font-medium">{t('dashboard:analytics.spendingTrend')}</span>
            <div className="flex items-center gap-1">
              {data.spendingTrend <= 0 ? (
                <TrendingDown className="h-3 w-3 text-success" />
              ) : (
                <TrendingUp className="h-3 w-3 text-destructive" />
              )}
              <span className={cn(
                "text-[11px] font-semibold tabular-nums",
                data.spendingTrend <= 0 ? "text-success" : "text-destructive"
              )}>
                {data.spendingTrend > 0 ? "+" : ""}{data.spendingTrend}%
              </span>
            </div>
          </div>
          <div className="flex-1 mb-2">
            <Sparkline values={cumulativeSpending} color="#8b5cf6" height={44} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground tabular-nums leading-tight">${formatCompact(data.totalSpent)}</p>
            <p className="text-[10px] text-muted-foreground">{t('dashboard:analytics.totalSpent')}</p>
          </div>
        </div>
      </div>
    </ChartCard>
  );
};

export default WeeklyActivityCard;
