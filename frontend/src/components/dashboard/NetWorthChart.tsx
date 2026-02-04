import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import ChartCard from "./ChartCard";
import { financeApi, dashboardApi } from "@/lib/api";

const NetWorthChart = () => {
  const [timeRange, setTimeRange] = useState<"7M" | "1A" | "Tudo">("7M");
  const [data, setData] = useState<Array<{ month: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

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
      title="Variação do Patrimônio (Net Asset Change)"
      subtitle="Evolução com base em saldos e transações do Open Finance"
      actions={
        <div className="flex items-center gap-1.5">
          {(["7M", "1A", "Tudo"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`
                min-h-[36px] min-w-[44px] px-3 py-2 text-xs font-medium rounded-lg transition-colors touch-manipulation
                ${
                  timeRange === range
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted"
                }
              `}
            >
              {range}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-56 sm:h-64 min-w-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
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
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
                color: "hsl(var(--foreground))",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: "4px" }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString("pt-BR")}`,
                "Patrimônio",
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={1.5}
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
