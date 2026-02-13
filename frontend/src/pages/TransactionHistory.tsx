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
  Plus,
  Calendar,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Check,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  MoreVertical,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

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

  // Add transaction dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTxName, setNewTxName] = useState("");
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxType, setNewTxType] = useState<string>("");
  const [newTxCategory, setNewTxCategory] = useState<string>("");
  const [newTxIsIncome, setNewTxIsIncome] = useState(false);

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

  // Actually download the CSV after user confirms
  const handleExportConfirm = () => {
    const headers = ["Description", "Amount", "Category", "Status", "Date"];
    const rows = sortedTransactions.map((tx: any) => [
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
  };

  // Add transaction
  const handleAddTransaction = () => {
    if (!newTxName || !newTxAmount) return;
    toast({
      title: t("transactions:transactionAdded"),
      variant: "success",
    });
    setAddDialogOpen(false);
    setNewTxName("");
    setNewTxAmount("");
    setNewTxType("");
    setNewTxCategory("");
    setNewTxIsIncome(false);
  };

  // Delete transaction
  const handleDeleteTransaction = (tx: any) => {
    toast({
      title: t("transactions:transactionDeleted"),
      variant: "success",
    });
    setTransactions((prev) =>
      prev.filter(
        (item) =>
          (item.id || item.pluggy_transaction_id) !==
          (tx.id || tx.pluggy_transaction_id)
      )
    );
  };

  // Computed KPI values
  const kpiValues = useMemo(() => {
    const income = transactions
      .filter((tx) => parseFloat(tx.amount ?? 0) >= 0)
      .reduce((s, tx) => s + parseFloat(tx.amount ?? 0), 0);
    const expenses = transactions
      .filter((tx) => parseFloat(tx.amount ?? 0) < 0)
      .reduce((s, tx) => s + Math.abs(parseFloat(tx.amount ?? 0)), 0);
    const net = income - expenses;
    const avg =
      transactions.length > 0
        ? transactions.reduce(
            (s, tx) => s + Math.abs(parseFloat(tx.amount ?? 0)),
            0
          ) / transactions.length
        : 0;
    return { income, expenses, net, avg };
  }, [transactions]);

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

  // KPI data keyed by stable ID
  const kpiData: Record<string, TxKpiDef> = {
    "tx-total-income": {
      title: t("transactions:totalIncome"),
      value: `$${kpiValues.income.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      change: "+15.2%",
      changeType: "positive",
      icon: ArrowDownLeft,
      watermark: TrendingDown,
    },
    "tx-total-expenses": {
      title: t("transactions:totalExpenses"),
      value: `$${kpiValues.expenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      change: "-3.8%",
      changeType: "negative",
      icon: ArrowUpRight,
      watermark: TrendingUp,
    },
    "tx-net-flow": {
      title: t("transactions:netFlow"),
      value: `${kpiValues.net >= 0 ? "+" : ""}$${Math.abs(kpiValues.net).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      change: "+8.5%",
      changeType: "positive",
      icon: Activity,
      watermark: Activity,
    },
    "tx-average-amount": {
      title: t("transactions:averageAmount"),
      value: `$${kpiValues.avg.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      changeType: "neutral",
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
      {/* Page Header */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          {t("transactions:title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("transactions:subtitle")}
        </p>
      </div>

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

            {/* Add Transaction Button */}
            <Button
              size="sm"
              className="h-9 gap-2 text-xs"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("transactions:addTransaction")}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

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

        {/* Quick Filters */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("transactions:quickFilters")}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {quickFilters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleQuickFilter(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  activeQuickFilter === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-foreground border-border hover:bg-muted/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
                            {isCredit ? "+" : "-"}$
                            {Math.abs(amount).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-4 pr-4">
                          <Badge
                            variant="outline"
                            className="text-xs font-normal border-border bg-muted/30"
                          >
                            {tx.category || t("transactions:others")}
                          </Badge>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="gap-2 cursor-pointer">
                                <Eye className="h-4 w-4" />
                                {t("transactions:viewDetails")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 cursor-pointer">
                                <Download className="h-4 w-4" />
                                {t("transactions:download")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 cursor-pointer">
                                <Pencil className="h-4 w-4" />
                                {t("transactions:edit")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-red-400 focus:text-red-400 cursor-pointer"
                                onClick={() => handleDeleteTransaction(tx)}
                              >
                                <Trash2 className="h-4 w-4" />
                                {t("transactions:delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            <Button onClick={handleExportConfirm} className="gap-2">
              <Download className="h-4 w-4" />
              {t("transactions:export")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t("transactions:addTransaction")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("transactions:addTransaction")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Transaction Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("transactions:transactionName")}
              </Label>
              <Input
                placeholder={t("transactions:enterTransactionName")}
                value={newTxName}
                onChange={(e) => setNewTxName(e.target.value)}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("transactions:amount")}
              </Label>
              <Input
                type="number"
                placeholder={t("transactions:enterAmount")}
                value={newTxAmount}
                onChange={(e) => setNewTxAmount(e.target.value)}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("transactions:type")}
              </Label>
              <Select
                value={newTxType || "none"}
                onValueChange={(v) => setNewTxType(v === "none" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("transactions:selectType")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
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

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("transactions:category")}
              </Label>
              <Select
                value={newTxCategory || "none"}
                onValueChange={(v) =>
                  setNewTxCategory(v === "none" ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("transactions:selectCategory")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
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

            {/* Income checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="income-check"
                checked={newTxIsIncome}
                onCheckedChange={(checked) =>
                  setNewTxIsIncome(checked === true)
                }
              />
              <Label htmlFor="income-check" className="text-sm cursor-pointer">
                {t("transactions:incomeTransaction")}
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setNewTxName("");
                setNewTxAmount("");
                setNewTxType("");
                setNewTxCategory("");
                setNewTxIsIncome(false);
              }}
            >
              {t("transactions:cancel")}
            </Button>
            <Button
              onClick={handleAddTransaction}
              disabled={!newTxName || !newTxAmount}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {t("transactions:add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionHistory;
