import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  Calculator,
  Filter,
  Download,
  Calendar,
  Eye,
  Check,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  GripVertical,
  Table2,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";

interface TxKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableTxKpiCard({ id, kpi }: { id: string; kpi: TxKpiDef }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "z-50 opacity-50 scale-105" : ""}`}
    >
      {/* Drag Handle */}
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
        {/* Watermark icon */}
        <kpi.watermark className="absolute -bottom-3 -right-3 h-24 w-24 text-muted-foreground/[0.06] pointer-events-none" />

        {/* Header: icon + title */}
        <div className="flex items-center gap-2.5 mb-3 relative z-10">
          <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground truncate">
            {kpi.title}
          </span>
        </div>

        {/* Value + Change */}
        <div className="relative z-10">
          <div className="text-2xl sm:text-[28px] font-bold text-foreground mb-1 tabular-nums tracking-tight leading-none">
            {kpi.value}
          </div>
          {kpi.change && kpi.changeType !== "neutral" && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`flex items-center gap-0.5 ${
                  kpi.changeType === "positive"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {kpi.changeType === "positive" ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-semibold tabular-nums">
                  {kpi.change}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CATEGORIES = [
  "Income",
  "Transfer",
  "Entertainment",
  "Shopping",
  "Food",
  "Transport",
  "Housing",
  "Health",
  "Education",
  "Utilities",
  "Subscriptions",
  "Travel",
  "Others",
];

const STATUSES = ["Completed", "Pending"];

const TYPES = ["Income", "Expense"];

// Sort configuration
type SortField = "description" | "amount" | "date";
type SortDirection = "asc" | "desc";

const formatDateForDisplay = (dateStr: string, locale: string) => {
  try {
    const localeMap: Record<string, string> = {
      "pt-BR": "pt-BR",
      en: "en-US",
      pt: "pt-BR",
    };
    const intlLocale = localeMap[locale] || locale;
    return new Date(dateStr).toLocaleDateString(intlLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const TX_KPI_IDS = [
  "tx-total-income",
  "tx-total-expenses",
  "tx-net-flow",
  "tx-average-amount",
] as const;

const TransactionHistory = () => {
  const { t, i18n } = useTranslation(["transactions", "common"]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  // KPI drag-and-drop order — persisted to localStorage
  const kpiStorageKey = `tx-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === TX_KPI_IDS.length &&
          TX_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...TX_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  // Data state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [accountId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(
    null
  );

  // Sort
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Filter dialog
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");

  // View toggle: table vs chart
  type TxViewMode = "table" | "chart";
  type TxChartMode = "daily" | "weekly" | "monthly" | "yearly";
  const [txView, setTxView] = useState<TxViewMode>("table");
  const [txChartMode, setTxChartMode] = useState<TxChartMode>("monthly");
  const [txChartData, setTxChartData] = useState<Array<{ period: string; income: number; expense: number }>>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Detail dialog
  const [detailTx, setDetailTx] = useState<any>(null);

  // Export success dialog
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Date range popover
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  // Set default date range (last 14 days)
  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 14);
    setDateTo(to.toISOString().slice(0, 10));
    setDateFrom(from.toISOString().slice(0, 10));
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await financeApi.getTransactions({
        page,
        limit,
        q: search || undefined,
        accountId: accountId || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      setTransactions(data.transactions || []);
      const res = data as {
        transactions?: any[];
        total?: number;
        pagination?: { total?: number; totalPages?: number };
      };
      const rawTotal = res.pagination?.total ?? res.total ?? 0;
      setTotal(Number(rawTotal));
      const pages =
        res.pagination?.totalPages ??
        Math.max(1, Math.ceil(Number(rawTotal) / limit));
      setTotalPages(pages);
    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      setError(
        err?.message ?? err?.error ?? t("transactions:errorLoading")
      );
      setTransactions([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, accountId, dateFrom, dateTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Fetch ALL transactions for the current period + previous period (for KPI calculations)
  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    const fetchKpiData = async () => {
      try {
        // Fetch all current-period transactions
        const currentData = await financeApi.getTransactions({
          page: 1,
          limit: 10000,
          q: search || undefined,
          accountId: accountId || undefined,
          from: dateFrom,
          to: dateTo,
        });
        setAllTransactions(currentData.transactions || []);

        // Calculate previous period of the same duration
        const fromDate = new Date(dateFrom + "T00:00:00");
        const toDate = new Date(dateTo + "T00:00:00");
        const durationMs = toDate.getTime() - fromDate.getTime();
        const prevTo = new Date(fromDate.getTime() - 1); // day before current "from"
        const prevFrom = new Date(prevTo.getTime() - durationMs);
        const prevData = await financeApi.getTransactions({
          page: 1,
          limit: 10000,
          q: search || undefined,
          accountId: accountId || undefined,
          from: prevFrom.toISOString().slice(0, 10),
          to: prevTo.toISOString().slice(0, 10),
        });
        setPrevTransactions(prevData.transactions || []);
      } catch {
        // Non-critical — keep empty arrays
      }
    };
    fetchKpiData();
  }, [dateFrom, dateTo, search, accountId]);

  useEffect(() => {
    setPage(1);
  }, [search, limit, accountId, dateFrom, dateTo]);

  // Quick filter handler
  const handleQuickFilter = (filter: string) => {
    if (activeQuickFilter === filter) {
      setActiveQuickFilter(null);
      setSearch("");
    } else {
      setActiveQuickFilter(filter);
      setSearch(filter);
    }
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
  };

  // Apply filter dialog
  const handleApplyFilters = () => {
    const parts: string[] = [];
    if (filterCategory) parts.push(filterCategory);
    if (filterStatus) parts.push(filterStatus);
    if (filterType) parts.push(filterType);
    setSearch(parts.join(" "));
    setFilterDialogOpen(false);
  };

  // Reset filter dialog
  const handleResetFilters = () => {
    setFilterCategory("");
    setFilterStatus("");
    setFilterType("");
    setSearch("");
    setActiveQuickFilter(null);
    setFilterDialogOpen(false);
  };

  // Export to CSV - show confirm dialog first
  const handleExport = () => {
    setExportDialogOpen(true);
  };

  // Actually download the CSV after user confirms — fetch ALL filtered records
  const [exporting, setExporting] = useState(false);

  const handleExportConfirm = async () => {
    try {
      setExporting(true);
      // Fetch all matching records (large limit) with the same filters
      const data = await financeApi.getTransactions({
        page: 1,
        limit: 10000,
        q: search || undefined,
        accountId: accountId || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      const allTx = data.transactions || [];

      const headers = ["Description", "Amount", "Category", "Status", "Date"];
      const rows = allTx.map((tx: any) => [
        `"${(tx.description || tx.merchant || "").replace(/"/g, '""')}"`,
        tx.amount || "0",
        tx.category || "",
        parseFloat(tx.amount ?? 0) >= 0
          ? "Completed"
          : tx.status || "Completed",
        tx.date || "",
      ]);
      const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDialogOpen(false);
      toast({
        title: t("transactions:exportSuccess"),
        description: t("transactions:exportSuccessDesc"),
        variant: "success",
      });
    } catch {
      toast({
        title: t("common:error"),
        description: t("transactions:errorLoading"),
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Fetch chart data when in chart mode
  const fetchChartData = useCallback(async () => {
    if (txView !== "chart") return;
    try {
      setChartLoading(true);
      const data = await financeApi.getTransactions({
        view: txChartMode,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        accountId: accountId || undefined,
      });
      setTxChartData(data.chartData || []);
    } catch {
      setTxChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [txView, txChartMode, dateFrom, dateTo, accountId]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Format chart period label
  const formatChartPeriod = (period: string) => {
    try {
      const d = new Date(period + "T00:00:00");
      const locale = i18n.language === "pt-BR" ? "pt-BR" : "en-US";
      switch (txChartMode) {
        case "daily":
          return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
        case "weekly":
          return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
        case "monthly":
          return d.toLocaleDateString(locale, { month: "short", year: "2-digit" });
        case "yearly":
          return d.getFullYear().toString();
        default:
          return period;
      }
    } catch {
      return period;
    }
  };

  // Helper: compute KPI totals from a list of transactions
  const computeKpi = useCallback((txList: any[]) => {
    const income = txList
      .filter((tx) => parseFloat(tx.amount ?? 0) >= 0)
      .reduce((s, tx) => s + parseFloat(tx.amount ?? 0), 0);
    const expenses = txList
      .filter((tx) => parseFloat(tx.amount ?? 0) < 0)
      .reduce((s, tx) => s + Math.abs(parseFloat(tx.amount ?? 0)), 0);
    const net = income - expenses;
    const avg =
      txList.length > 0
        ? txList.reduce((s, tx) => s + Math.abs(parseFloat(tx.amount ?? 0)), 0) / txList.length
        : 0;
    return { income, expenses, net, avg };
  }, []);

  // Computed KPI values from ALL transactions in the period (not just the current page)
  const kpiValues = useMemo(() => computeKpi(allTransactions), [allTransactions, computeKpi]);
  const prevKpiValues = useMemo(() => computeKpi(prevTransactions), [prevTransactions, computeKpi]);

  // Calculate percentage change between current and previous period
  const kpiChanges = useMemo(() => {
    const pct = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };
    return {
      income: pct(kpiValues.income, prevKpiValues.income),
      expenses: pct(kpiValues.expenses, prevKpiValues.expenses),
      net: pct(kpiValues.net, prevKpiValues.net),
      avg: pct(kpiValues.avg, prevKpiValues.avg),
    };
  }, [kpiValues, prevKpiValues]);

  // Sorted transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === "description") {
        const aDesc = (a.description || a.merchant || "").toLowerCase();
        const bDesc = (b.description || b.merchant || "").toLowerCase();
        cmp = aDesc.localeCompare(bDesc);
      } else if (sortField === "amount") {
        cmp = parseFloat(a.amount ?? 0) - parseFloat(b.amount ?? 0);
      } else {
        cmp =
          new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [transactions, sortField, sortDirection]);

  // Derive transaction subtitle from data
  const getTxSubtitle = (tx: any) => {
    const amount = parseFloat(tx.amount ?? 0);
    const cat = (tx.category || "").toLowerCase();
    if (cat.includes("transfer") || cat.includes("transferência"))
      return t("transactions:bankTransfer");
    if (cat.includes("subscription") || cat.includes("recurring"))
      return t("transactions:recurringPayment");
    if (
      amount >= 0 &&
      (cat.includes("salary") ||
        cat.includes("income") ||
        cat.includes("deposit"))
    )
      return t("transactions:directDeposit");
    if (
      cat.includes("card") ||
      cat.includes("payment") ||
      cat.includes("shopping") ||
      cat.includes("food")
    )
      return t("transactions:cardPayment");
    if (amount >= 0) return t("transactions:bankTransfer");
    return t("transactions:cardPayment");
  };

  // Get status for transaction
  const getTxStatus = (tx: any) => {
    if (tx.status) {
      const s = tx.status.toLowerCase();
      if (s === "pending" || s === "pendente") return "pending";
    }
    return "completed";
  };

  // Format date range for display
  const dateRangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return t("transactions:all");
    const locale = i18n.language === "pt-BR" ? "pt-BR" : "en-US";
    const from = dateFrom
      ? new Date(dateFrom + "T00:00:00").toLocaleDateString(locale, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
    const to = dateTo
      ? new Date(dateTo + "T00:00:00").toLocaleDateString(locale, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
    return `${from} - ${to}`;
  }, [dateFrom, dateTo, i18n.language]);

  // Format a percentage change for display
  const fmtChange = (pct: number): { change?: string; changeType: "positive" | "negative" | "neutral" } => {
    if (pct === 0) return { changeType: "neutral" };
    const sign = pct > 0 ? "+" : "";
    return {
      change: `${sign}${pct.toFixed(1)}%`,
      changeType: pct > 0 ? "positive" : "negative",
    };
  };

  // KPI data keyed by stable ID — values from ALL period transactions, changes from previous period
  const kpiData: Record<string, TxKpiDef> = {
    "tx-total-income": {
      title: t("transactions:totalIncome"),
      value: formatCurrency(kpiValues.income),
      ...fmtChange(kpiChanges.income),
      icon: ArrowDownLeft,
      watermark: TrendingDown,
    },
    "tx-total-expenses": {
      title: t("transactions:totalExpenses"),
      value: formatCurrency(kpiValues.expenses),
      ...fmtChange(kpiChanges.expenses),
      icon: ArrowUpRight,
      watermark: TrendingUp,
    },
    "tx-net-flow": {
      title: t("transactions:netFlow"),
      value: `${kpiValues.net >= 0 ? "+" : ""}${formatCurrency(Math.abs(kpiValues.net))}`,
      ...fmtChange(kpiChanges.net),
      icon: Activity,
      watermark: Activity,
    },
    "tx-average-amount": {
      title: t("transactions:averageAmount"),
      value: formatCurrency(kpiValues.avg),
      ...fmtChange(kpiChanges.avg),
      icon: Calculator,
      watermark: Calculator,
    },
  };

  // Quick filter list
  const quickFilters = [
    { key: "Income", label: t("transactions:income") },
    { key: "Transfer", label: t("transactions:transfer") },
    { key: "Entertainment", label: t("transactions:entertainment") },
    { key: "Shopping", label: t("transactions:shopping") },
    { key: "Food", label: t("transactions:food") },
    { key: "Pending", label: t("transactions:pending") },
    { key: "Completed", label: t("transactions:completed") },
  ];

  // Sort header component
  const SortHeader = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => (
    <button
      type="button"
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      onClick={() => handleSort(field)}
    >
      {label}
      <ArrowUpDown
        className={`h-3 w-3 ${
          sortField === field ? "text-foreground" : "opacity-40"
        }`}
      />
    </button>
  );

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6">
      {/* KPI Cards Row — Draggable */}
      <DndContext
        sensors={kpiSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleKpiDragEnd}
      >
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpiOrder.map((id) => {
              const kpi = kpiData[id];
              if (!kpi) return null;
              return <SortableTxKpiCard key={id} id={id} kpi={kpi} />;
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Transaction History Card */}
      <div className="chart-card space-y-4">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("transactions:chartTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("transactions:chartSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setTxView("table")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  txView === "table"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("transactions:views.table")}</span>
              </button>
              <button
                onClick={() => setTxView("chart")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                  txView === "chart"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("transactions:views.chart")}</span>
              </button>
            </div>

            {/* Date Range Picker */}
            <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 text-xs font-normal"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="max-w-[200px] truncate">
                    {dateRangeLabel}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="end">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: t("transactions:days7"), days: 7 },
                      { label: t("transactions:days30"), days: 30 },
                      { label: t("transactions:days90"), days: 90 },
                      { label: t("transactions:all"), days: null },
                    ].map(({ label, days }) => (
                      <Button
                        key={label}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => {
                          if (days === null) {
                            setDateFrom("");
                            setDateTo("");
                          } else {
                            const to = new Date();
                            const from = new Date();
                            from.setDate(from.getDate() - days);
                            setDateTo(to.toISOString().slice(0, 10));
                            setDateFrom(from.toISOString().slice(0, 10));
                          }
                          setDateRangeOpen(false);
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-8 text-xs w-[140px]"
                    />
                    <span className="text-xs text-muted-foreground">—</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-8 text-xs w-[140px]"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Filter Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-xs"
              onClick={() => setFilterDialogOpen(true)}
            >
              <Filter className="h-3.5 w-3.5" />
              {t("transactions:filter")}
            </Button>

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-xs"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" />
              {t("transactions:export")}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ── Table View ── */}
        {txView === "table" && (
          <>
            {/* Search Bar */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("transactions:searchPlaceholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveQuickFilter(null);
                }}
                className="pl-9 h-10 text-sm"
              />
            </div>

            {/* Transaction Table */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("transactions:loadingTransactions")}
                </p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="rounded-full bg-muted/50 p-5 mb-4">
                  <Receipt className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">
                  {t("transactions:noTransactions")}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {t("transactions:noTransactionsDesc")}
                </p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-3 pr-4">
                          <SortHeader
                            field="description"
                            label={t("transactions:description")}
                          />
                        </th>
                        <th className="text-left pb-3 pr-4">
                          <SortHeader
                            field="amount"
                            label={t("transactions:amount")}
                          />
                        </th>
                        <th className="text-left pb-3 pr-4">
                          <span className="text-xs font-medium text-muted-foreground">
                            {t("transactions:category")}
                          </span>
                        </th>
                        <th className="text-left pb-3 pr-4">
                          <span className="text-xs font-medium text-muted-foreground">
                            {t("transactions:status")}
                          </span>
                        </th>
                        <th className="text-left pb-3 pr-4">
                          <SortHeader
                            field="date"
                            label={t("transactions:date")}
                          />
                        </th>
                        <th className="w-10 pb-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedTransactions.map((tx: any, index: number) => {
                        const amount = parseFloat(tx.amount ?? 0);
                        const isCredit = amount >= 0;
                        const amountColor = isCredit
                          ? "text-emerald-400"
                          : "text-red-400";
                        const Icon = isCredit ? ArrowUpRight : ArrowDownLeft;
                        const iconBg = isCredit
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400";
                        const txStatus = getTxStatus(tx);

                        return (
                          <tr
                            key={
                              tx.id ??
                              tx.pluggy_transaction_id ??
                              `${tx.date}-${tx.description}-${index}`
                            }
                            className="group hover:bg-muted/20 transition-colors"
                          >
                            {/* Description */}
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {tx.description ||
                                      tx.merchant ||
                                      t("transactions:transaction")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {getTxSubtitle(tx)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="py-4 pr-4">
                              <span
                                className={`text-sm font-semibold tabular-nums ${amountColor}`}
                              >
                                {isCredit ? "+" : "-"}{formatCurrency(Math.abs(amount)).replace(/^-/, "")}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="py-4 pr-4">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" className="cursor-pointer">
                                    <Badge
                                      variant="outline"
                                      className="text-xs font-normal border-border bg-muted/30 hover:bg-muted/60 transition-colors"
                                    >
                                      {tx.category || t("transactions:others")}
                                    </Badge>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1" align="start">
                                  <div className="space-y-0.5">
                                    {CATEGORIES.map((cat) => (
                                      <button
                                        key={cat}
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await financeApi.updateTransactionCategory(tx.id, cat);
                                            setTransactions((prev) =>
                                              prev.map((t2) =>
                                                t2.id === tx.id ? { ...t2, category: cat } : t2
                                              )
                                            );
                                            toast({ title: t("transactions:categoryUpdated") });
                                          } catch {
                                            toast({ title: t("transactions:categoryUpdateError"), variant: "destructive" });
                                          }
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${
                                          tx.category === cat
                                            ? "bg-primary/20 text-primary font-medium"
                                            : "text-foreground hover:bg-muted"
                                        }`}
                                      >
                                        {cat}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </td>

                            {/* Status */}
                            <td className="py-4 pr-4">
                              <Badge
                                className={`text-xs font-medium border ${
                                  txStatus === "completed"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                }`}
                              >
                                {txStatus === "completed"
                                  ? t("transactions:completed")
                                  : t("transactions:pending")}
                              </Badge>
                            </td>

                            {/* Date */}
                            <td className="py-4 pr-4">
                              <span className="text-sm text-muted-foreground">
                                {tx.date
                                  ? formatDateForDisplay(tx.date, i18n.language)
                                  : "—"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-4">
                              <button
                                type="button"
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                                title={t("transactions:viewDetails")}
                                onClick={() => setDetailTx(tx)}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {t("transactions:showing", {
                      from: (page - 1) * limit + 1,
                      to: Math.min(page * limit, total),
                      total,
                    })}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      {t("transactions:previous")}
                    </Button>
                    <div className="flex items-center gap-0.5">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let p: number;
                          if (totalPages <= 5) p = i + 1;
                          else if (page <= 3) p = i + 1;
                          else if (page >= totalPages - 2)
                            p = totalPages - 4 + i;
                          else p = page - 2 + i;
                          return (
                            <Button
                              key={p}
                              variant={page === p ? "default" : "outline"}
                              size="sm"
                              className="min-w-8 h-8 p-0 text-xs"
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </Button>
                          );
                        }
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      {t("transactions:next")}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Chart View ── */}
        {txView === "chart" && (
          <div className="space-y-4">
            {/* Chart mode selector */}
            <div className="flex gap-1.5 flex-wrap">
              {(["daily", "weekly", "monthly", "yearly"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={txChartMode === mode ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTxChartMode(mode)}
                >
                  {t(`transactions:chart.${mode}`)}
                </Button>
              ))}
            </div>

            {chartLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("transactions:loadingTransactions")}
                </p>
              </div>
            ) : txChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="rounded-full bg-muted/50 p-5 mb-4">
                  <BarChart3 className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">
                  {t("transactions:noTransactions")}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {t("transactions:noTransactionsDesc")}
                </p>
              </div>
            ) : (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={txChartData.map((d) => ({ ...d, periodLabel: formatChartPeriod(d.period) }))}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="custIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="custExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                      </linearGradient>
                      <filter id="custBarShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} />
                    <XAxis
                      dataKey="periodLabel"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => formatCurrency(v)}
                      width={80}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "income"
                          ? t("transactions:chart.income")
                          : t("transactions:chart.expense"),
                      ]}
                      labelFormatter={(label) => label}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "income"
                          ? t("transactions:chart.income")
                          : t("transactions:chart.expense")
                      }
                    />
                    <Bar
                      dataKey="income"
                      fill="url(#custIncomeGradient)"
                      radius={[4, 4, 0, 0]}
                      filter="url(#custBarShadow)"
                    />
                    <Bar
                      dataKey="expense"
                      fill="url(#custExpenseGradient)"
                      radius={[4, 4, 0, 0]}
                      filter="url(#custBarShadow)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t("transactions:filterTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("transactions:filterTitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("transactions:category")}
              </Label>
              <Select
                value={filterCategory || "all"}
                onValueChange={(v) =>
                  setFilterCategory(v === "all" ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("transactions:selectCategory")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("transactions:selectCategory")}
                  </SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("transactions:status")}
              </Label>
              <Select
                value={filterStatus || "all"}
                onValueChange={(v) =>
                  setFilterStatus(v === "all" ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("transactions:selectStatus")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("transactions:selectStatus")}
                  </SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("transactions:type")}
              </Label>
              <Select
                value={filterType || "all"}
                onValueChange={(v) =>
                  setFilterType(v === "all" ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("transactions:selectType")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("transactions:selectType")}
                  </SelectItem>
                  {TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {tp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleResetFilters}>
              {t("transactions:cancel")}
            </Button>
            <Button onClick={handleApplyFilters} className="gap-2">
              <Check className="h-4 w-4" />
              {t("transactions:apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Confirm Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Download className="h-4 w-4 text-primary" />
              </div>
              {t("transactions:export")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2">
              {t("transactions:exportSuccessDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
            >
              {t("transactions:cancel")}
            </Button>
            <Button onClick={handleExportConfirm} disabled={exporting} className="gap-2">
              <Download className={`h-4 w-4 ${exporting ? "animate-spin" : ""}`} />
              {exporting ? t("common:loading") : t("transactions:export")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!detailTx} onOpenChange={(open) => { if (!open) setDetailTx(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2.5">
              {(() => {
                const amt = parseFloat(detailTx?.amount ?? 0);
                const isCredit = amt >= 0;
                const iconBg = isCredit
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/15 text-red-400";
                const Icon = isCredit ? ArrowUpRight : ArrowDownLeft;
                return (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                );
              })()}
              <span className="truncate">
                {detailTx?.description || detailTx?.merchant || t("transactions:transaction")}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("transactions:viewDetails")}
            </DialogDescription>
          </DialogHeader>
          {detailTx && (() => {
            const amt = parseFloat(detailTx.amount ?? 0);
            const isCredit = amt >= 0;
            const txStatus = getTxStatus(detailTx);
            return (
              <div className="space-y-4 py-2">
                {/* Amount */}
                <div className="flex items-center justify-between rounded-lg bg-muted/30 p-4">
                  <span className="text-sm text-muted-foreground">{t("transactions:amount")}</span>
                  <span className={`text-xl font-bold tabular-nums ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                    {isCredit ? "+" : "-"}{formatCurrency(Math.abs(amt)).replace(/^-/, "")}
                  </span>
                </div>

                {/* Detail rows */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("transactions:type")}</span>
                    <span className="text-sm font-medium text-foreground">
                      {isCredit ? t("transactions:income") : t("transactions:expense")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("transactions:category")}</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="cursor-pointer">
                          <Badge variant="outline" className="text-xs font-normal border-border bg-muted/30 hover:bg-muted/60 transition-colors">
                            {detailTx.category || t("transactions:others")}
                          </Badge>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1" align="end">
                        <div className="space-y-0.5">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={async () => {
                                try {
                                  await financeApi.updateTransactionCategory(detailTx.id, cat);
                                  setTransactions((prev) =>
                                    prev.map((t2) =>
                                      t2.id === detailTx.id ? { ...t2, category: cat } : t2
                                    )
                                  );
                                  setDetailTx({ ...detailTx, category: cat });
                                  toast({ title: t("transactions:categoryUpdated") });
                                } catch {
                                  toast({ title: t("transactions:categoryUpdateError"), variant: "destructive" });
                                }
                              }}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${
                                detailTx.category === cat
                                  ? "bg-primary/20 text-primary font-medium"
                                  : "text-foreground hover:bg-muted"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("transactions:status")}</span>
                    <Badge
                      className={`text-xs font-medium border ${
                        txStatus === "completed"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {txStatus === "completed" ? t("transactions:completed") : t("transactions:pending")}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("transactions:date")}</span>
                    <span className="text-sm font-medium text-foreground">
                      {detailTx.date ? formatDateForDisplay(detailTx.date, i18n.language) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("transactions:detail.method")}</span>
                    <span className="text-sm font-medium text-foreground">
                      {getTxSubtitle(detailTx)}
                    </span>
                  </div>

                  {detailTx.merchant && detailTx.description && detailTx.merchant !== detailTx.description && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t("transactions:detail.merchant")}</span>
                      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                        {detailTx.merchant}
                      </span>
                    </div>
                  )}

                  {detailTx.pluggy_transaction_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t("transactions:detail.transactionId")}</span>
                      <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                        {detailTx.pluggy_transaction_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTx(null)} className="w-full sm:w-auto">
              {t("transactions:detail.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default TransactionHistory;
