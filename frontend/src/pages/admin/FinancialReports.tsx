import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, CreditCard, Download, Calendar, BarChart3, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <div className="space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Relatórios Financeiros</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe receitas, comissões e transações financeiras
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Select
              value={period}
              onValueChange={(v: "month" | "quarter" | "year") => setPeriod(v)}
            >
              <SelectTrigger className="w-[130px] sm:w-[140px]" aria-label="Período">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mensal</SelectItem>
                <SelectItem value="quarter">Trimestral</SelectItem>
                <SelectItem value="year">Anual</SelectItem>
              </SelectContent>
            </Select>
            {period === "year" && (
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
                <SelectTrigger className="w-[100px] sm:w-[110px]" aria-label="Ano">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-lg">
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchFinancialReports} className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading && revenueData.length === 0 ? (
          [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="rounded-xl border border-border h-[100px] sm:h-[108px]" />
          ))
        ) : (
          <>
            <div className="rounded-xl border-2 border-emerald-500/80 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-all">
              <ProfessionalKpiCard
                title="Receita Total"
                value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change={periodSubtitle}
                changeType="neutral"
                icon={DollarSign}
                iconClassName="text-emerald-500"
                subtitle=""
              />
            </div>
            <div className="rounded-xl border-2 border-blue-500/80 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-all">
              <ProfessionalKpiCard
                title="MRR"
                value={`R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change="recorrente"
                changeType="positive"
                icon={TrendingUp}
                iconClassName="text-blue-500"
                subtitle="mensal"
              />
            </div>
            <div className="rounded-xl border-2 border-violet-500/80 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-all">
              <ProfessionalKpiCard
                title="Comissões"
                value={`R$ ${totalCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change=""
                changeType="neutral"
                icon={CreditCard}
                iconClassName="text-violet-500"
                subtitle="pagos a consultores"
              />
            </div>
            <div className="rounded-xl border-2 border-cyan-500/80 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-cyan-500/5 transition-all">
              <ProfessionalKpiCard
                title="Receita Líquida"
                value={`R$ ${netRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change=""
                changeType="positive"
                icon={DollarSign}
                iconClassName="text-cyan-500"
                subtitle="receita - comissões"
              />
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Evolução de Receitas" subtitle="Receita vs Cobranças" className="rounded-xl border border-border bg-card/50">
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
                  }}
                  formatter={(value: number, name: string) =>
                    name === "Receita (R$)" ? [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, name] : [value, name]
                  }
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Receita (R$)" dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="subscriptions" stroke="hsl(var(--success))" name="Cobranças" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-center px-4">
              <div className="rounded-full bg-muted/50 p-4">
                <BarChart3 className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Sem dados de receita no período</p>
              <p className="text-xs text-muted-foreground max-w-xs">Altere o período ou aguarde novas cobranças para visualizar a evolução.</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Comissões por Consultor" subtitle="Distribuição de comissões" className="rounded-xl border border-border bg-card/50">
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
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
                  }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Comissão (R$)"]}
                />
                <Legend />
                <Bar dataKey="commission" fill="hsl(var(--primary))" name="Comissão (R$)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-center px-4">
              <div className="rounded-full bg-muted/50 p-4">
                <TrendingUp className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Sem dados de comissões</p>
              <p className="text-xs text-muted-foreground max-w-xs">As comissões pagas a consultores aparecerão aqui quando houver movimentação.</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Transaction Statement */}
      <ChartCard title="Extrato de Transações" subtitle="Transações no período selecionado" className="rounded-xl border border-border bg-card/50">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">Lista</span>
            <div className="flex items-center gap-2">
              {(dateFrom || dateTo) && (
                <span className="text-xs text-muted-foreground truncate">
                  {dateFrom || "..."} a {dateTo || "..."}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setFilterDialogOpen(true)} className="gap-2" aria-label="Filtrar por período">
                <Calendar className="h-4 w-4" />
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
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center px-4">
              <div className="rounded-full bg-muted/50 p-4">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhuma transação no período</p>
              <p className="text-xs text-muted-foreground max-w-xs">Use &quot;Filtrar Período&quot; para alterar o intervalo ou aguarde novas transações.</p>
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={clearDateFilter}>
              Limpar
            </Button>
            <Button onClick={applyDateFilter}>Aplicar filtro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialReports;
