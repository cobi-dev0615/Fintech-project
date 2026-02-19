import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Download,
  Calendar,
  BarChart3,
  FileText,
  RefreshCw,
  GripVertical,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { adminApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
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

// --- Types ---

type RevenueRow = { month: string; revenue: number; subscriptions: number };
type CommissionRow = { consultant: string; clients: number; commission: number };
type TransactionRow = { id?: string; date: string; type: string; amount: number; client: string };

interface FinKpiDef {
  title: string;
  value: string;
  subtitle?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableFinKpiCard({ id, kpi }: { id: string; kpi: FinKpiDef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "z-50 opacity-50 scale-105" : ""}`}
    >
      <button
        type="button"
        className="drag-handle absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/80 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none rounded-md p-1 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="kpi-card relative overflow-hidden h-full">
        <kpi.watermark className="absolute -bottom-3 -right-3 h-24 w-24 text-muted-foreground/[0.06] pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-3 relative z-10">
          <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground truncate">
            {kpi.title}
          </span>
        </div>

        <div className="relative z-10">
          <div className="text-2xl sm:text-[28px] font-bold text-foreground mb-1 tabular-nums tracking-tight leading-none">
            {kpi.value}
          </div>
          {kpi.subtitle && (
            <span className="text-xs text-muted-foreground">{kpi.subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Constants ---

const FIN_KPI_IDS = ["fin-revenue", "fin-mrr", "fin-commissions", "fin-net"] as const;
const currentYear = new Date().getFullYear();
const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

// --- Component ---

const FinancialReports = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { formatCurrency } = useCurrency();
  const { user: authUser } = useAuth();
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

  // --- KPI DnD ---

  const kpiStorageKey = `admin-financial-kpi-order-${authUser?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === FIN_KPI_IDS.length &&
          FIN_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...FIN_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleKpiDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setKpiOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, moved);
      localStorage.setItem(kpiStorageKey, JSON.stringify(next));
      return next;
    });
  };

  // --- Data fetching ---

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

  // --- KPI Computation ---

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCommissions = commissionsData.reduce((sum, item) => sum + item.commission, 0);
  const netRevenue = totalRevenue - totalCommissions;

  const periodSubtitle =
    period === "year"
      ? t('admin:financialReports.periods.year', { year })
      : period === "quarter"
        ? t('admin:financialReports.periods.quarters')
        : t('admin:financialReports.periods.months');

  const kpiData = useMemo(() => ({
    "fin-revenue": {
      title: t('admin:financialReports.kpis.totalRevenue'),
      value: formatCurrency(totalRevenue),
      subtitle: periodSubtitle,
      changeType: "neutral" as const,
      icon: DollarSign,
      watermark: DollarSign,
    },
    "fin-mrr": {
      title: t('admin:financialReports.kpis.mrr'),
      value: formatCurrency(mrr),
      subtitle: t('admin:financialReports.kpis.recurring'),
      changeType: "positive" as const,
      icon: TrendingUp,
      watermark: TrendingUp,
    },
    "fin-commissions": {
      title: t('admin:financialReports.kpis.commissions'),
      value: formatCurrency(totalCommissions),
      subtitle: t('admin:financialReports.kpis.paidToConsultants'),
      changeType: "neutral" as const,
      icon: CreditCard,
      watermark: CreditCard,
    },
    "fin-net": {
      title: t('admin:financialReports.kpis.netRevenue'),
      value: formatCurrency(netRevenue),
      subtitle: t('admin:financialReports.kpis.revenueMinusCommissions'),
      changeType: "positive" as const,
      icon: DollarSign,
      watermark: DollarSign,
    },
  }), [totalRevenue, mrr, totalCommissions, netRevenue, periodSubtitle, t, formatCurrency]);

  // --- Export ---

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
    transactionData.forEach((tx) => {
      rows.push(
        `${tx.date};${tx.type};${tx.client};${(tx.amount ?? 0).toFixed(2).replace(".", ",")}`
      );
    });
    const csv = rows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t('admin:financialReports.downloadFilename', { date: new Date().toISOString().slice(0, 10) });
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
      {loading && revenueData.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[100px] sm:h-[108px] rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
          <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpiOrder.map((id) => (
                <SortableFinKpiCard key={id} id={id} kpi={kpiData[id as keyof typeof kpiData]} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title={t('admin:financialReports.charts.revenueEvolution')}
          subtitle={t('admin:financialReports.charts.revenueVsCharges')}
          actions={
            <div className="flex items-center gap-2">
              <Select
                value={period}
                onValueChange={(v: "month" | "quarter" | "year") => setPeriod(v)}
              >
                <SelectTrigger className="h-8 w-[120px] text-sm" aria-label={t('admin:financialReports.periodLabel')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{t('admin:financialReports.periodOptions.monthly')}</SelectItem>
                  <SelectItem value="quarter">{t('admin:financialReports.periodOptions.quarterly')}</SelectItem>
                  <SelectItem value="year">{t('admin:financialReports.periodOptions.yearly')}</SelectItem>
                </SelectContent>
              </Select>
              {period === "year" && (
                <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
                  <SelectTrigger className="h-8 w-[90px] text-sm" aria-label={t('common:year')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" onClick={handleExport} disabled={loading} className="gap-1.5 h-8">
                <Download className="h-3.5 w-3.5" />
                {t('common:export')}
              </Button>
            </div>
          }
        >
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
                    color: "hsl(var(--foreground))",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(value: number, name: string) =>
                    name === t('admin:financialReports.charts.revenueLabel') ? [formatCurrency(value), name] : [value, name]
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

        <ChartCard
          title={t('admin:financialReports.charts.commissionsByConsultant')}
          subtitle={t('admin:financialReports.charts.commissionDistribution')}
        >
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
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
                    color: "hsl(var(--foreground))",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(value: number) => [formatCurrency(value), t('admin:financialReports.charts.commissionLabel')]}
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
      <ChartCard
        title={t('admin:financialReports.transactions.title')}
        subtitle={t('admin:financialReports.transactions.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            {(dateFrom || dateTo) && (
              <span className="text-xs text-muted-foreground truncate">
                {dateFrom || "..."} {t('admin:financialReports.transactions.to')} {dateTo || "..."}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => setFilterDialogOpen(true)} className="gap-1.5 h-8" aria-label={t('admin:financialReports.transactions.filterPeriod')}>
              <Calendar className="h-3.5 w-3.5" />
              {t('admin:financialReports.transactions.filterPeriod')}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {transactionData.length > 0 ? (
            transactionData.map((transaction, index) => (
              <div
                key={transaction.id ?? index}
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
                    {formatCurrency(Math.abs(transaction.amount))}
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
