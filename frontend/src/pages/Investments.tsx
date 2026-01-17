import { useState } from "react";
import { TrendingUp, PieChart, BarChart3 } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

const Investments = () => {
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "6M" | "1A" | "Tudo">("1A");

  const allocationData = [
    { name: "Ações", value: 45000, color: "#3b82f6" },
    { name: "FIIs", value: 28000, color: "#06b6d4" },
    { name: "BDRs", value: 15200, color: "#8b5cf6" },
    { name: "Tesouro Direto", value: 10000, color: "#10b981" },
  ];

  const performanceData = [
    { month: "Jan", value: 92000 },
    { month: "Fev", value: 94500 },
    { month: "Mar", value: 96000 },
    { month: "Abr", value: 97500 },
    { month: "Mai", value: 98000 },
    { month: "Jun", value: 97000 },
    { month: "Jul", value: 98200 },
  ];

  const benchmarkData = [
    { name: "Seu Portfólio", value: 8.2, color: "#3b82f6" },
    { name: "CDI", value: 12.5, color: "#6b7280" },
    { name: "IBOV", value: 5.8, color: "#10b981" },
  ];

  const holdings = [
    { ticker: "PETR4", name: "Petrobras", quantity: 100, avgPrice: 28.50, currentPrice: 32.10, value: 3210 },
    { ticker: "VALE3", name: "Vale", quantity: 50, avgPrice: 65.20, currentPrice: 68.90, value: 3445 },
    { ticker: "ITUB4", name: "Itaú Unibanco", quantity: 200, avgPrice: 22.30, currentPrice: 24.15, value: 4830 },
    { ticker: "HGLG11", name: "CSHG Logística", quantity: 150, avgPrice: 185.00, currentPrice: 192.50, value: 28875 },
    { ticker: "XPLG11", name: "XP Log", quantity: 100, avgPrice: 95.20, currentPrice: 98.60, value: 9860 },
  ];

  const totalValue = allocationData.reduce((sum, item) => sum + item.value, 0);
  const totalPerformance = ((performanceData[performanceData.length - 1].value - performanceData[0].value) / performanceData[0].value) * 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investimentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Portfólio consolidado de investimentos
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Valor Total"
          value={`R$ ${totalValue.toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Performance"
          value={`+${totalPerformance.toFixed(1)}%`}
          change="no período"
          changeType="positive"
          icon={BarChart3}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Posições"
          value={holdings.length.toString()}
          change=""
          changeType="neutral"
          icon={PieChart}
          subtitle="ativos"
        />
        <ProfessionalKpiCard
          title="Corretoras"
          value="3"
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle="conectadas"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Alocação por Tipo"
          subtitle="Distribuição do portfólio"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    `R$ ${value.toLocaleString("pt-BR")}`
                  }
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {allocationData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-foreground font-medium tabular-nums">
                  R$ {item.value.toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Performance"
          subtitle="Evolução do portfólio"
          actions={
            <div className="flex items-center gap-1">
              {(["1M", "3M", "6M", "1A", "Tudo"] as const).map((range) => (
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
              <LineChart data={performanceData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
                  }}
                  formatter={(value: number) =>
                    `R$ ${value.toLocaleString("pt-BR")}`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Benchmark Comparison */}
      <ChartCard title="Comparação com Benchmarks">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={benchmarkData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `${value}%`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                formatter={(value: number) => `${value}%`}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {benchmarkData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Holdings Table */}
      <ChartCard title="Posições">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Ativo
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Quantidade
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Preço Médio
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Preço Atual
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Valor
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Variação
                </th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding) => {
                const variation = ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
                return (
                  <tr
                    key={holding.ticker}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {holding.ticker}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {holding.name}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-foreground tabular-nums">
                      {holding.quantity}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-foreground tabular-nums">
                      R$ {holding.avgPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-foreground tabular-nums">
                      R$ {holding.currentPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-foreground tabular-nums">
                      R$ {holding.value.toLocaleString("pt-BR")}
                    </td>
                    <td
                      className={`py-3 px-4 text-right text-sm font-medium tabular-nums ${
                        variation >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {variation >= 0 ? "+" : ""}
                      {variation.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

export default Investments;
