import { useState, useEffect, useCallback } from "react";
import { TrendingUp, PieChart as PieChartIcon, RefreshCw, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investimentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dados do Open Finance — portfólio consolidado
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando…" : "Atualizar"}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfessionalKpiCard
              title="Valor total"
              value={`R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              change=""
              changeType="neutral"
              icon={TrendingUp}
              subtitle="Open Finance"
            />
            <ProfessionalKpiCard
              title="Posições"
              value={investments.length.toString()}
              change=""
              changeType="neutral"
              icon={PieChartIcon}
              subtitle="ativos"
            />
            <ProfessionalKpiCard
              title="Tipos"
              value={breakdown.length.toString()}
              change=""
              changeType="neutral"
              icon={TrendingUp}
              subtitle="categorias"
            />
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Legend />
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

          <ChartCard title="Posições (Open Finance)">
            {investments.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  Nenhum investimento encontrado. Conecte contas em Conexões para ver seus ativos aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Ativo
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Tipo
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Quantidade
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Preço unit.
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Valor atual
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Rentab.
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card">
                    {investments.map((inv: any) => {
                      const value = parseFloat(inv.current_value || 0);
                      const qty = parseFloat(inv.quantity || 0);
                      const unitPrice = parseFloat(inv.unit_price || 0);
                      const profitability = inv.profitability != null ? parseFloat(inv.profitability) : null;
                      return (
                        <tr
                          key={inv.id || inv.pluggy_investment_id}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
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
