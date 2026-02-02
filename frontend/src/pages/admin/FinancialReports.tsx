import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, CreditCard, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const currentYear = new Date().getFullYear();
const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

type RevenueRow = { month: string; revenue: number; subscriptions: number };
type CommissionRow = { consultant: string; clients: number; commission: number };
type TransactionRow = { id?: string; date: string; type: string; amount: number; client: string };

const FinancialReports = () => {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueRow[]>([]);
  const [commissionsData, setCommissionsData] = useState<CommissionRow[]>([]);
  const [transactionData, setTransactionData] = useState<TransactionRow[]>([]);
  const [mrr, setMrr] = useState(0);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancialReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { period?: string; year?: number; dateFrom?: string; dateTo?: string } = {
        period,
        year: period === "year" ? year : undefined,
      };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const data = await adminApi.getFinancialReports(params);
      setRevenueData(data.revenue ?? []);
      setCommissionsData(data.commissions ?? []);
      setTransactionData(data.transactions ?? []);
      setMrr(data.mrr ?? 0);
    } catch (err: any) {
      console.error("Failed to fetch financial reports:", err);
      setError(err?.message || "Erro ao carregar relatórios.");
      setRevenueData([]);
      setCommissionsData([]);
      setTransactionData([]);
      setMrr(0);
    } finally {
      setLoading(false);
    }
  }, [period, year, dateFrom, dateTo]);

  useEffect(() => {
    fetchFinancialReports();
  }, [fetchFinancialReports]);

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCommissions = commissionsData.reduce((sum, item) => sum + item.commission, 0);
  const netRevenue = totalRevenue - totalCommissions;

  const periodSubtitle =
    period === "year"
      ? `ano ${year}`
      : period === "quarter"
        ? "últimos 4 trimestres"
        : "últimos 6 meses";

  const handleExport = () => {
    const rows: string[] = [];
    rows.push("Relatórios Financeiros");
    rows.push(`Período: ${periodSubtitle}`);
    rows.push("");
    rows.push("Receita por período;Receita (R$);Cobranças");
    revenueData.forEach((r) => {
      rows.push(`${r.month};${r.revenue.toFixed(2).replace(".", ",")};${r.subscriptions ?? 0}`);
    });
    rows.push("");
    rows.push("Consultor;Clientes;Comissão (R$)");
    commissionsData.forEach((c) => {
      rows.push(`${c.consultant};${c.clients};${(c.commission ?? 0).toFixed(2).replace(".", ",")}`);
    });
    rows.push("");
    rows.push("Data;Tipo;Cliente;Valor (R$)");
    transactionData.forEach((t) => {
      rows.push(
        `${t.date};${t.type};${t.client};${(t.amount ?? 0).toFixed(2).replace(".", ",")}`
      );
    });
    const csv = rows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorios-financeiros-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyDateFilter = () => {
    setFilterDialogOpen(false);
    fetchFinancialReports();
  };

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    setFilterDialogOpen(false);
    fetchFinancialReports();
  };

  if (loading && revenueData.length === 0 && commissionsData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando relatórios financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe receitas, comissões e transações financeiras
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={period}
            onValueChange={(v: "month" | "quarter" | "year") => setPeriod(v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="quarter">Trimestral</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
            </SelectContent>
          </Select>
          {period === "year" && (
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={handleExport} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Receita Total"
          value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change={periodSubtitle}
          changeType="neutral"
          icon={DollarSign}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="MRR"
          value={`R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change="recorrente"
          changeType="positive"
          icon={TrendingUp}
          subtitle="mensal"
        />
        <ProfessionalKpiCard
          title="Comissões"
          value={`R$ ${totalCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change=""
          changeType="neutral"
          icon={CreditCard}
          subtitle="pagos a consultores"
        />
        <ProfessionalKpiCard
          title="Receita Líquida"
          value={`R$ ${netRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change=""
          changeType="positive"
          icon={DollarSign}
          subtitle="receita - comissões"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Evolução de Receitas" subtitle="Receita vs Cobranças">
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number, name: string) =>
                    name === "Receita (R$)" ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : value
                  }
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  name="Receita (R$)"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="subscriptions"
                  stroke="#10b981"
                  name="Cobranças"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de receita no período
            </div>
          )}
        </ChartCard>

        <ChartCard title="Comissões por Consultor" subtitle="Distribuição de comissões">
          {commissionsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={commissionsData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="consultant"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="commission" fill="#8b5cf6" name="Comissão (R$)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de comissões
            </div>
          )}
        </ChartCard>
      </div>

      {/* Transaction Statement */}
      <ChartCard title="Extrato de Transações">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Transações</span>
            <div className="flex items-center gap-2">
              {(dateFrom || dateTo) && (
                <span className="text-xs text-muted-foreground">
                  {dateFrom || "..."} a {dateTo || "..."}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setFilterDialogOpen(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Filtrar Período
              </Button>
            </div>
          </div>
          {transactionData.length > 0 ? (
            transactionData.map((transaction, index) => (
              <div
                key={(transaction as TransactionRow & { id?: string }).id ?? index}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.amount > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {transaction.amount > 0 ? (
                      <DollarSign className="h-5 w-5" />
                    ) : (
                      <CreditCard className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{transaction.type}</div>
                    <div className="text-xs text-muted-foreground">{transaction.client}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-semibold ${
                      transaction.amount > 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {transaction.amount > 0 ? "+" : ""}
                    R$ {Math.abs(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground">{transaction.date}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhuma transação no período
            </div>
          )}
        </div>
      </ChartCard>

      {/* Date filter dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtrar por período</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">De</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Até</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearDateFilter}>
              Limpar
            </Button>
            <Button onClick={applyDateFilter}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialReports;
