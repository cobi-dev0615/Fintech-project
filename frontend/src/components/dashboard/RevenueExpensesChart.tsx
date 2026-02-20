import { useState, useEffect } from "react";
import { ComposedChart, Area, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartCard from "./ChartCard";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { dashboardApi } from "@/lib/api-dashboard";

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;
type Period = typeof PERIODS[number];

const formatPeriodLabel = (value: string, period: Period) => {
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    if (period === 'yearly') return date.getFullYear().toString();
    if (period === 'monthly') return date.toLocaleDateString('en', { month: 'short' });
    if (period === 'weekly') return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
};

const RevenueExpensesChart = () => {
  const { t } = useTranslation(['dashboard']);
  const { formatCurrency } = useCurrency();
  const [activePeriod, setActivePeriod] = useState<Period>('monthly');
  const [data, setData] = useState<Array<{ period: string; income: number; expenses: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await dashboardApi.getSpendingAnalytics(activePeriod);
        if (!cancelled) {
          setData(result.revenueVsExpenses || []);
        }
      } catch (error) {
        console.error("Error fetching revenue vs expenses:", error);
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [activePeriod]);

  const chartData = data.map(d => ({
    ...d,
    label: formatPeriodLabel(d.period, activePeriod),
  }));

  const handleDownload = () => {
    const csv = ['Period,Income,Expenses', ...data.map(d => `${d.period},${d.income},${d.expenses}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revenue-vs-expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ChartCard
      title={t('dashboard:analytics.revenueVsExpenses')}
      className="h-full"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={cn(
                  "px-2 py-1 text-[10px] sm:px-3 sm:py-1.5 sm:text-xs font-medium transition-colors",
                  activePeriod === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {t(`dashboard:analytics.${p}`)}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      }
    >
      <div className="h-64 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('dashboard:analytics.noData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => formatCurrency(v)}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  backdropFilter: "blur(8px)",
                  color: "hsl(var(--foreground))",
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'income' ? t('dashboard:analytics.income') : t('dashboard:analytics.expenses'),
                ]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="expenses" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#incomeGradient)"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
};

export default RevenueExpensesChart;
