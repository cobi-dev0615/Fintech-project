import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import ChartCard from "./ChartCard";
import { financeApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;
type Period = typeof PERIODS[number];

const NetWorthChart = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { formatCurrency } = useCurrency();
  const [activePeriod, setActivePeriod] = useState<Period>('monthly');
  const [data, setData] = useState<Array<{ month: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await financeApi.getNetWorthEvolution(undefined, activePeriod);
        if (!cancelled) setData(response.data || []);
      } catch (error) {
        console.error("Error fetching net worth evolution:", error);
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [activePeriod]);

  return (
    <ChartCard
      title={t('chart.title')}
      subtitle={t('chart.subtitle')}
      actions={
        <div className="flex rounded-lg border border-border overflow-hidden">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                activePeriod === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {t(`dashboard:analytics.${p}`)}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-56 sm:h-64 min-w-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">{t('chart.loading')}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">{t('chart.noData')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="0"
              stroke="rgba(59, 130, 246, 0.08)"
              opacity={1}
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "rgba(148, 163, 184, 0.8)" }}
              dy={10}
              strokeOpacity={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "rgba(148, 163, 184, 0.8)" }}
              tickFormatter={formatCurrency}
              width={70}
              strokeOpacity={0}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(8, 12, 20, 0.95)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
                color: "#ffffff",
                fontSize: "13px",
                padding: "10px 14px",
                backdropFilter: "blur(12px)",
              }}
              labelStyle={{
                color: "rgba(148, 163, 184, 0.9)",
                fontWeight: 600,
                marginBottom: "6px",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
              formatter={(value: number) => [
                formatCurrency(value),
                t('chart.tooltipLabel'),
              ]}
              cursor={{ stroke: 'rgba(59, 130, 246, 0.2)', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#netWorthGradient)"
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
};

export default NetWorthChart;
