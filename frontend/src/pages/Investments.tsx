import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, PieChart as PieChartIcon, RefreshCw, Building2, Link2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Skeleton } from "@/components/ui/skeleton";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Label,
} from "recharts";

const TYPE_LABELS: Record<string, string> = {
  fund: "Fundos",
  cdb: "CDB",
  lci: "LCI",
  lca: "LCA",
  stock: "Ações",
  etf: "ETFs",
  reit: "FIIs",
  other: "Outros",
};

const TYPE_COLORS: Record<string, string> = {
  fund: "#8b5cf6",
  cdb: "#10b981",
  lci: "#06b6d4",
  lca: "#0ea5e9",
  stock: "#3b82f6",
  etf: "#f59e0b",
  reit: "#ec4899",
  other: "#6b7280",
};

const Investments = () => {
  const { toast } = useToast();
  const [investments, setInvestments] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financeApi
        .getInvestments()
        .catch(() => ({ investments: [], total: 0, breakdown: [] }));

      setInvestments(data.investments || []);
      setTotalValue(typeof data.total === "number" ? data.total : 0);
      setBreakdown(data.breakdown || []);
      setError(null);
    } catch (err: any) {
      setError(err?.error || "Erro ao carregar investimentos");
      console.error("Error fetching investments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchData();
      toast({
        title: "Sincronização concluída",
        description: "Seus investimentos foram atualizados.",
      });
    } catch (err: any) {
      toast({
        title: "Erro na sincronização",
        description: err?.error || "Não foi possível sincronizar.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const allocationData = breakdown
    .filter((b) => b.total > 0)
    .map((b) => ({
      name: TYPE_LABELS[b.type] || b.type,
      value: parseFloat(b.total) || 0,
      color: TYPE_COLORS[b.type] || TYPE_COLORS.other,
    }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Investimentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dados do Open Finance — portfólio consolidado
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing || loading}
          className="shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
          {syncing ? "Sincronizando…" : "Atualizar"}
        </Button>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg w-full" />
        </>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchData()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
            <div className="rounded-xl border-2 border-blue-500/70 bg-card p-4 min-w-0 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow">
              <ProfessionalKpiCard
                title="Valor total"
                value={`R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change=""
                changeType="neutral"
                icon={TrendingUp}
                iconClassName="text-blue-600 dark:text-blue-400"
                subtitle="Open Finance"
              />
            </div>
            <div className="rounded-xl border-2 border-emerald-500/70 bg-card p-4 min-w-0 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow">
              <ProfessionalKpiCard
                title="Posições"
                value={investments.length.toString()}
                change=""
                changeType="neutral"
                icon={PieChartIcon}
                iconClassName="text-emerald-600 dark:text-emerald-400"
                subtitle="ativos"
              />
            </div>
            <div className="rounded-xl border-2 border-violet-500/70 bg-card p-4 min-w-0 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-shadow">
              <ProfessionalKpiCard
                title="Tipos"
                value={breakdown.length.toString()}
                change=""
                changeType="neutral"
                icon={TrendingUp}
                iconClassName="text-violet-600 dark:text-violet-400"
                subtitle="categorias"
              />
            </div>
          </div>

          {allocationData.length > 0 && (
            <ChartCard title="Alocação por tipo" subtitle="Distribuição do portfólio (Open Finance)">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={false}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                      <Label
                        content={({ viewBox }: { viewBox?: { cx?: number; cy?: number } }) => {
                          const cx = viewBox?.cx ?? 0;
                          const cy = viewBox?.cy ?? 0;
                          const first = allocationData[0];
                          if (allocationData.length === 1 && first) {
                            return (
                              <g>
                                <text x={cx} y={cy} textAnchor="middle" fill="white" className="text-sm font-medium">
                                  {first.name}: R$ {first.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </text>
                              </g>
                            );
                          }
                          return (
                            <g>
                              <text x={cx} y={cy - 6} textAnchor="middle" fill="white" className="text-sm font-medium">
                                Total
                              </text>
                              <text x={cx} y={cy + 10} textAnchor="middle" fill="white" className="text-sm font-bold">
                                R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </text>
                            </g>
                          );
                        }}
                      />
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        color: "hsl(var(--card-foreground))",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {allocationData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">
                      R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          <ChartCard title="Posições (Open Finance)" subtitle={investments.length > 0 ? `${investments.length} posição(ões)` : undefined}>
            {investments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 sm:py-16">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 text-primary" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum investimento encontrado</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                  Conecte suas contas pelo Open Finance para ver ativos, fundos e rentabilidade aqui.
                </p>
                <Link to="/app/connections/open-finance">
                  <Button className="gap-2">
                    <Link2 className="h-4 w-4" />
                    Ir para Conexões
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground mt-4">
                  Menu lateral → Conexões → Open Finance
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Ativo
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Quantidade
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Preço unit.
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Valor atual
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Rentab.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map((inv: any) => {
                      const value = parseFloat(inv.current_value || 0);
                      const qty = parseFloat(inv.quantity || 0);
                      const unitPrice = parseFloat(inv.unit_price || 0);
                      const profitability = inv.profitability != null ? parseFloat(inv.profitability) : null;
                      return (
                        <tr
                          key={inv.id || inv.pluggy_investment_id}
                          className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {inv.name || "—"}
                              </p>
                              {inv.institution_name && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {inv.institution_name}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground">
                              {TYPE_LABELS[inv.type] || inv.type || "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-sm tabular-nums">
                            {qty > 0 ? qty.toLocaleString("pt-BR") : "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-sm tabular-nums">
                            {unitPrice > 0
                              ? `R$ ${unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                              : "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-medium tabular-nums">
                            R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right text-sm tabular-nums">
                            {profitability != null ? (
                              <span className={profitability >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                                {profitability >= 0 ? "+" : ""}
                                {(profitability * 100).toFixed(2)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
};

export default Investments;
