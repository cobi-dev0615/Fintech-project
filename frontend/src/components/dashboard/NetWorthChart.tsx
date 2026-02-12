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
        <div className="flex items-center gap-1 rounded-lg p-1 bg-background/50">
          {(["7M", "1A", "all"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`
                min-h-[30px] min-w-[42px] px-3 py-1.5 text-xs font-semibold rounded-md transition-all touch-manipulation
                ${
                  timeRange === range
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
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
              tickFormatter={formatCompact}
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
                formatFull(value),
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
