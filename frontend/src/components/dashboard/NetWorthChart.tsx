import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import ChartCard from "./ChartCard";
import { financeApi, dashboardApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

const NetWorthChart = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [timeRange, setTimeRange] = useState<"7M" | "1A" | "all">("7M");
  const [data, setData] = useState<Array<{ month: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  const locale = t('common:locale');

  const formatCompact = (value: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 0 }).format(value);

  const formatFull = (value: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(value);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const months = timeRange === "7M" ? 7 : timeRange === "1A" ? 12 : 24;
        // Use Open Finance endpoint first; fall back to legacy dashboard API
        const response = await financeApi.getNetWorthEvolution(months).catch(() =>
          dashboardApi.getNetWorthEvolution(months)
        );
        setData(response.data || []);
      } catch (error) {
        console.error("Error fetching net worth evolution:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  return (
    <ChartCard
      title={t('chart.title')}
      subtitle={t('chart.subtitle')}
      actions={
        <div className="flex items-center gap-0.5 rounded-lg p-0.5 bg-muted/40 border border-border/40">
          {(["7M", "1A", "all"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`
                min-h-[28px] min-w-[36px] px-2.5 py-1 text-xs font-medium rounded-md transition-all touch-manipulation
                ${
                  timeRange === range
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }
              `}
            >
              {t(`chart.timeRange.${range}`)}
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
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={formatCompact}
              width={65}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                color: "hsl(var(--foreground))",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))", fontWeight: 500, marginBottom: "4px", fontSize: "11px" }}
              formatter={(value: number) => [
                formatFull(value),
                t('chart.tooltipLabel'),
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#netWorthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
};

export default NetWorthChart;
