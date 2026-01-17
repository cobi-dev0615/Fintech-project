import { useState } from "react";
import { TrendingUp, Calendar, AlertCircle } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const B3Portfolio = () => {
  const positions = [
    { ticker: "PETR4", name: "Petrobras", quantity: 100, avgPrice: 28.50, currentPrice: 32.10, value: 3210, variation: 12.6 },
    { ticker: "VALE3", name: "Vale", quantity: 50, avgPrice: 65.20, currentPrice: 68.90, value: 3445, variation: 5.7 },
    { ticker: "ITUB4", name: "Itaú Unibanco", quantity: 200, avgPrice: 22.30, currentPrice: 24.15, value: 4830, variation: 8.3 },
    { ticker: "BBDC4", name: "Bradesco", quantity: 150, avgPrice: 14.80, currentPrice: 15.25, value: 2287.50, variation: 3.0 },
    { ticker: "ABEV3", name: "Ambev", quantity: 300, avgPrice: 12.50, currentPrice: 13.20, value: 3960, variation: 5.6 },
  ];

  const dividends = [
    { ticker: "PETR4", amount: 150.00, date: "15/02/2024", type: "Dividendo" },
    { ticker: "VALE3", amount: 245.00, date: "10/02/2024", type: "Dividendo" },
    { ticker: "ITUB4", amount: 320.00, date: "05/02/2024", type: "JCP" },
    { ticker: "ABEV3", amount: 180.00, date: "01/02/2024", type: "Dividendo" },
  ];

  const corporateEvents = [
    { ticker: "PETR4", event: "Assembleia Geral", date: "25/02/2024", type: "evento" },
    { ticker: "VALE3", event: "Splits de ações", date: "20/03/2024", type: "evento" },
  ];

  const performanceData = [
    { month: "Ago", value: 42000 },
    { month: "Set", value: 43500 },
    { month: "Out", value: 44200 },
    { month: "Nov", value: 44800 },
    { month: "Dez", value: 45500 },
    { month: "Jan", value: 46800 },
    { month: "Fev", value: 17732.50 },
  ];

  const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
  const totalDividends = dividends.reduce((sum, div) => sum + div.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfólio B3</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ações, dividendos e eventos corporativos
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
          subtitle="em ações"
        />
        <ProfessionalKpiCard
          title="Posições"
          value={positions.length.toString()}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle="ativos"
        />
        <ProfessionalKpiCard
          title="Dividendos"
          value={`R$ ${totalDividends.toLocaleString("pt-BR")}`}
          change="este mês"
          changeType="positive"
          icon={Calendar}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Eventos"
          value={corporateEvents.length.toString()}
          change="próximos 60 dias"
          changeType="neutral"
          icon={AlertCircle}
          subtitle=""
        />
      </div>

      {/* Performance Chart */}
      <ChartCard
        title="Performance do Portfólio"
        subtitle="Evolução do valor total"
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
                formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Positions Table */}
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
              {positions.map((position) => (
                <tr
                  key={position.ticker}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {position.ticker}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {position.name}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-foreground tabular-nums">
                    {position.quantity}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-foreground tabular-nums">
                    R$ {position.avgPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-foreground tabular-nums">
                    R$ {position.currentPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-foreground tabular-nums">
                    R$ {position.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    className={`py-3 px-4 text-right text-sm font-medium tabular-nums ${
                      position.variation >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {position.variation >= 0 ? "+" : ""}
                    {position.variation.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Dividends and Corporate Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Dividendos Recebidos" subtitle="Este mês">
          <div className="space-y-3">
            {dividends.map((dividend, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{dividend.ticker}</p>
                  <p className="text-xs text-muted-foreground">{dividend.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-success tabular-nums">
                    R$ {dividend.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">{dividend.date}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Eventos Corporativos" subtitle="Próximos 60 dias">
          <div className="space-y-3">
            {corporateEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{event.ticker}</p>
                  <p className="text-xs text-muted-foreground">{event.event}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{event.date}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default B3Portfolio;

