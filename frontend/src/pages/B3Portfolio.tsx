import { useState, useEffect } from "react";
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
import { investmentsApi } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";

const B3Portfolio = () => {
  const { formatCurrency } = useCurrency();
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        setLoading(true);
        const data = await investmentsApi.getHoldings();
        // Filter for B3 holdings (equities, reits) or filter by source
        const b3Holdings = data.holdings.filter((h: any) => 
          h.source === 'b3' || h.asset_class === 'equities' || h.asset_class === 'reit'
        );
        setHoldings(b3Holdings);
        setError(null);
      } catch (err: any) {
        setError(err?.error || "Erro ao carregar portfólio B3");
        console.error("Error fetching B3 portfolio:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHoldings();
  }, []);

  const positions = holdings.map((h) => {
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

  const dividends: any[] = []; // TODO: Fetch from dividends table
  const corporateEvents: any[] = []; // TODO: Fetch from corporate_events table
  const performanceData: any[] = []; // TODO: Historical performance data

  const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
  const totalDividends = dividends.reduce((sum, div) => sum + div.amount, 0);

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
          value={formatCurrency(totalValue)}
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
          value={formatCurrency(totalDividends)}
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
                tickFormatter={(value) => formatCurrency(value)}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                formatter={(value: number) => formatCurrency(value)}
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
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma posição B3 encontrada
                  </td>
                </tr>
              ) : (
                positions.map((position) => (
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
                    {formatCurrency(position.avgPrice)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-foreground tabular-nums">
                    {formatCurrency(position.currentPrice)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-foreground tabular-nums">
                    {formatCurrency(position.value)}
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
              ))
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Dividends and Corporate Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Dividendos Recebidos" subtitle="Este mês">
          <div className="space-y-3">
            {dividends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dividendo este mês
              </p>
            ) : (
              dividends.map((dividend, index) => (
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
                    {formatCurrency(dividend.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{dividend.date}</p>
                </div>
              </div>
              ))
            )}
          </div>
        </ChartCard>

        <ChartCard title="Eventos Corporativos" subtitle="Próximos 60 dias">
          <div className="space-y-3">
            {corporateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum evento próximo
              </p>
            ) : (
              corporateEvents.map((event, index) => (
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
              ))
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default B3Portfolio;

