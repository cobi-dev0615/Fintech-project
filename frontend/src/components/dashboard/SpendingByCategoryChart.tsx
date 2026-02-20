import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import ChartCard from "./ChartCard";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { dashboardApi } from "@/lib/api-dashboard";

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#06b6d4', '#6b7280'];

const PERIODS = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;
type Period = typeof PERIODS[number];
const PERIOD_LABELS: Record<Period, string> = { weekly: '1W', monthly: '1M', quarterly: '3M', yearly: '1Y' };

const SpendingByCategoryChart = () => {
  const { t } = useTranslation(['dashboard']);
  const { formatCurrency } = useCurrency();
  const [activePeriod, setActivePeriod] = useState<Period>('monthly');
  const [data, setData] = useState<Array<{ category: string; total: number; percentage: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await dashboardApi.getSpendingByCategory(activePeriod);
        if (!cancelled) {
          setData(result.spendingByCategory || []);
        }
      } catch (error) {
        console.error("Error fetching spending by category:", error);
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [activePeriod]);

  const grandTotal = data.reduce((sum, d) => sum + d.total, 0);
  const topCategory = data[0];

  return (
    <ChartCard title={t('dashboard:analytics.spendingByCategory')}>
      <div className="flex flex-col items-center">
        {/* Period selector */}
        <div className="flex rounded-lg border border-border overflow-hidden mb-3 self-center">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={cn(
                "px-3 py-1 text-[11px] font-medium transition-colors",
                activePeriod === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            {t('dashboard:analytics.noData')}
          </div>
        ) : (
          <>
            <div className="w-full h-44 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="total"
                    stroke="none"
                  >
                    {data.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              {topCategory && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-foreground">{topCategory.percentage}%</span>
                  <span className="text-[10px] text-muted-foreground">{t(`dashboard:analytics.categories.${topCategory.category}`, { defaultValue: topCategory.category })}</span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="w-full space-y-2 mt-2">
              {data.map((item, idx) => (
                <div key={item.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-muted-foreground truncate">{t(`dashboard:analytics.categories.${item.category}`, { defaultValue: item.category })}</span>
                  </div>
                  <span className="text-foreground font-medium tabular-nums ml-2">{item.percentage}%</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between w-full mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">{t('dashboard:analytics.totalExpenses')}</span>
              <span className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </>
        )}
      </div>
    </ChartCard>
  );
};

export default SpendingByCategoryChart;
