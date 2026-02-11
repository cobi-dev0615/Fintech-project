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
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation(['admin', 'common']);
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
      setError(err?.message || t('admin:financialReports.errorLoading'));
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
      ? t('admin:financialReports.periods.year', { year })
      : period === "quarter"
        ? t('admin:financialReports.periods.quarters')
        : t('admin:financialReports.periods.months');

  const handleExport = () => {
    const rows: string[] = [];
    rows.push(t('admin:financialReports.title'));
    rows.push(`${t('admin:financialReports.export.period')}: ${periodSubtitle}`);
    rows.push("");
    rows.push(`${t('admin:financialReports.export.revenueHeaders')};${t('admin:financialReports.export.revenueValue')};${t('admin:financialReports.export.charges')}`);
    revenueData.forEach((r) => {
      rows.push(`${r.month};${r.revenue.toFixed(2).replace(".", ",")};${r.subscriptions ?? 0}`);
    });
    rows.push("");
    rows.push(`${t('admin:financialReports.export.consultant')};${t('admin:financialReports.export.clients')};${t('admin:financialReports.export.commission')}`);
    commissionsData.forEach((c) => {
      rows.push(`${c.consultant};${c.clients};${(c.commission ?? 0).toFixed(2).replace(".", ",")}`);
    });
    rows.push("");
    rows.push(`${t('admin:financialReports.export.date')};${t('admin:financialReports.export.type')};${t('admin:financialReports.export.client')};${t('admin:financialReports.export.amount')}`);
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('admin:financialReports.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin:financialReports.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Select
              value={period}
              onValueChange={(v: "month" | "quarter" | "year") => setPeriod(v)}
            >
              <SelectTrigger className="w-[130px] sm:w-[140px]" aria-label={t('admin:financialReports.periodLabel')}>
                <SelectValue placeholder={t('admin:financialReports.periodLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">{t('admin:financialReports.periodOptions.monthly')}</SelectItem>
                <SelectItem value="quarter">{t('admin:financialReports.periodOptions.quarterly')}</SelectItem>
                <SelectItem value="year">{t('admin:financialReports.periodOptions.yearly')}</SelectItem>
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
            {t('common:export')}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-lg">
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchFinancialReports} className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {t('common:tryAgain')}
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
                title={t('admin:financialReports.kpis.totalRevenue')}
                value={`R$ ${totalRevenue.toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}`}
                change={periodSubtitle}
                changeType="neutral"
                icon={DollarSign}
                iconClassName="text-emerald-500"
                subtitle=""
              />
            </div>
            <div className="rounded-xl border-2 border-blue-500/80 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-all">
              <ProfessionalKpiCard
                title={t('admin:financialReports.kpis.mrr')}
                value={`R$ ${mrr.toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}`}
                change={t('admin:financialReports.kpis.recurring')}
                changeType="positive"
                icon={TrendingUp}
                iconClassName="text-blue-500"
                subtitle={t('common:monthly')}
              />
            </div>
            <div className="rounded-xl border-2 border-violet-500/80 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-all">
              <ProfessionalKpiCard
                title={t('admin:financialReports.kpis.commissions')}
                value={`R$ ${totalCommissions.toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}`}
                change=""
                changeType="neutral"
                icon={CreditCard}
                iconClassName="text-violet-500"
                subtitle={t('admin:financialReports.kpis.paidToConsultants')}
              />
            </div>
            <div className="rounded-xl border-2 border-cyan-500/80 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-cyan-500/5 transition-all">
              <ProfessionalKpiCard
                title={t('admin:financialReports.kpis.netRevenue')}
                value={`R$ ${netRevenue.toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}`}
                change=""
                changeType="positive"
                icon={DollarSign}
                iconClassName="text-cyan-500"
                subtitle={t('admin:financialReports.kpis.revenueMinusCommissions')}
              />
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={t('admin:financialReports.charts.revenueEvolution')} subtitle={t('admin:financialReports.charts.revenueVsCharges')} className="rounded-xl border border-border bg-card/50">
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
                    name === t('admin:financialReports.charts.revenueLabel') ? [`R$ ${value.toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}`, name] : [value, name]
                  }
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name={t('admin:financialReports.charts.revenueLabel')} dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="subscriptions" stroke="hsl(var(--success))" name={t('admin:financialReports.charts.chargesLabel')} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-center px-4">
              <div className="rounded-full bg-muted/50 p-4">
                <BarChart3 className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{t('admin:financialReports.charts.noRevenueData')}</p>
              <p className="text-xs text-muted-foreground max-w-xs">{t('admin:financialReports.charts.noRevenueDesc')}</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title={t('admin:financialReports.charts.commissionsByConsultant')} subtitle={t('admin:financialReports.charts.commissionDistribution')} className="rounded-xl border border-border bg-card/50">
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
                  formatter={(value: number) => [`R$ ${value.toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}`, t('admin:financialReports.charts.commissionLabel')]}
                />
                <Legend />
                <Bar dataKey="commission" fill="hsl(var(--primary))" name={t('admin:financialReports.charts.commissionLabel')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-center px-4">
              <div className="rounded-full bg-muted/50 p-4">
                <TrendingUp className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{t('admin:financialReports.charts.noCommissionData')}</p>
              <p className="text-xs text-muted-foreground max-w-xs">{t('admin:financialReports.charts.noCommissionDesc')}</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Transaction Statement */}
      <ChartCard title={t('admin:financialReports.transactions.title')} subtitle={t('admin:financialReports.transactions.subtitle')} className="rounded-xl border border-border bg-card/50">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">{t('admin:financialReports.transactions.list')}</span>
            <div className="flex items-center gap-2">
              {(dateFrom || dateTo) && (
                <span className="text-xs text-muted-foreground truncate">
                  {dateFrom || "..."} {t('admin:financialReports.transactions.to')} {dateTo || "..."}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setFilterDialogOpen(true)} className="gap-2" aria-label={t('admin:financialReports.transactions.filterPeriod')}>
                <Calendar className="h-4 w-4" />
                {t('admin:financialReports.transactions.filterPeriod')}
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
                    R$ {Math.abs(transaction.amount).toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}
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
              <p className="text-sm font-medium text-foreground">{t('admin:financialReports.transactions.noTransactions')}</p>
              <p className="text-xs text-muted-foreground max-w-xs">{t('admin:financialReports.transactions.noTransactionsDesc')}</p>
            </div>
          )}
        </div>
      </ChartCard>

      {/* Date filter dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin:financialReports.filterDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">{t('admin:financialReports.filterDialog.from')}</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">{t('admin:financialReports.filterDialog.to')}</Label>
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
              {t('common:clear')}
            </Button>
            <Button onClick={applyDateFilter}>{t('admin:financialReports.filterDialog.apply')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialReports;
