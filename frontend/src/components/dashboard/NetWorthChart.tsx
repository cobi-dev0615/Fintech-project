import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import ChartCard from "./ChartCard";

const data = [
  { month: "Jul", value: 98000 },
  { month: "Ago", value: 102000 },
  { month: "Set", value: 99500 },
  { month: "Out", value: 108000 },
  { month: "Nov", value: 115000 },
  { month: "Dez", value: 112000 },
  { month: "Jan", value: 124532 },
];

const NetWorthChart = () => {
  const [timeRange, setTimeRange] = useState<"7M" | "1A" | "Tudo">("7M");

  return (
    <ChartCard
      title="Evolução do Patrimônio Líquido"
      subtitle="Últimos 7 meses"
      actions={
        <div className="flex items-center gap-1">
          {(["7M", "1A", "Tudo"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-2.5 py-1 text-xs font-medium rounded transition-colors
                ${
                  timeRange === range
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }
              `}
            >
              {range}
          </button>
          ))}
        </div>
      }
    >
      <div className="h-64">
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
      </div>
    </ChartCard>
  );
};

export default NetWorthChart;
