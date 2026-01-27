import { useState, useEffect } from "react";
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
import { investmentsApi } from "@/lib/api";

const Investments = () => {
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "6M" | "1A" | "Tudo">("1A");
  const [holdings, setHoldings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [holdingsData, summaryData] = await Promise.all([
          investmentsApi.getHoldings(),
          investmentsApi.getSummary(),
        ]);
        setHoldings(holdingsData.holdings);
        setSummary(summaryData.summary);
        setError(null);
      } catch (err: any) {
        setError(err?.error || "Erro ao carregar investimentos");
        console.error("Error fetching investments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Group holdings by asset class for allocation chart
  const allocationByClass: Record<string, { name: string; value: number; color: string }> = {};
  holdings.forEach((h) => {
    const classKey = h.asset_class || 'other';
    const value = parseFloat(h.market_value_cents || 0) / 100;
    if (!allocationByClass[classKey]) {
      const colors: Record<string, string> = {
        equities: "#3b82f6",
        reit: "#06b6d4",
        fixed_income: "#10b981",
        funds: "#8b5cf6",
        etf: "#f59e0b",
        other: "#6b7280",
      };
      const labels: Record<string, string> = {
        equities: "Ações",
        reit: "FIIs",
        fixed_income: "Renda Fixa",
        funds: "Fundos",
        etf: "ETFs",
        other: "Outros",
      };
      allocationByClass[classKey] = {
        name: labels[classKey] || classKey,
        value: 0,
        color: colors[classKey] || "#6b7280",
      };
    }
    allocationByClass[classKey].value += value;
  });
  const allocationData = Object.values(allocationByClass);

  const performanceData: any[] = []; // TODO: Historical performance data
  const benchmarkData: any[] = []; // TODO: Benchmark comparison data
  const totalValue = summary ? parseFloat(summary.total_value || 0) / 100 : 0;
  const totalPerformanceRaw = summary && totalValue > 0 
    ? (parseFloat(summary.total_pnl || 0) / 100 / totalValue) * 100 
    : 0;
  const totalPerformance = isNaN(totalPerformanceRaw) || !isFinite(totalPerformanceRaw) ? 0 : totalPerformanceRaw;

  const mappedHoldings = holdings.map((h) => {
    const marketValue = parseFloat(h.market_value_cents || 0) / 100;
    const avgPrice = parseFloat(h.avg_price_cents || 0) / 100;
    const currentPrice = parseFloat(h.current_price_cents || 0) / 100;
    const variation = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
    return {
      ticker: h.asset_symbol || h.asset_name_fallback || "N/A",
      name: h.asset_name || h.asset_name_fallback || "Ativo",
      quantity: parseFloat(h.quantity || 0),
      avgPrice,
      currentPrice,
      value: marketValue,
      variation,
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

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
          value={`R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Performance"
          value={`${totalPerformance >= 0 ? "+" : ""}${totalPerformance.toFixed(1)}%`}
          change="no período"
          changeType={totalPerformance >= 0 ? "positive" : "negative"}
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
          value="—"
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
            {allocationData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum investimento encontrado
              </p>
            ) : (
              allocationData.map((item) => (
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
              ))
            )}
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
          {benchmarkData.length > 0 ? (
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Dados de benchmark não disponíveis</p>
            </div>
          )}
        </div>
      </ChartCard>

      {/* Holdings Table */}
      <ChartCard title="Posições">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Ativo
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Quantidade
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Preço Médio
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Preço Atual
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Valor
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Variação
                </th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {mappedHoldings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma posição encontrada
                  </td>
                </tr>
              ) : (
                mappedHoldings.map((holding) => (
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
                        holding.variation >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {holding.variation >= 0 ? "+" : ""}
                      {holding.variation.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

export default Investments;
