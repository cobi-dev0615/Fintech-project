import { useState, useEffect, useMemo } from "react";
import {
  Search,
  CreditCard,
  DollarSign,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  AlertTriangle,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Types ---

interface Payment {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  paidAt: string | null;
  provider: string | null;
  providerPaymentId: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  subscription: {
    id: string;
    plan: {
      name: string;
      code: string;
    };
  } | null;
}

interface SubscriptionHistory {
  id: string;
  status: string;
  planName: string;
  planCode: string;
  priceCents: number;
  startedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface PayKpiDef {
  title: string;
  value: string;
  subtitle?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortablePayKpiCard({ id, kpi }: { id: string; kpi: PayKpiDef }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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
            <span className="text-xs text-muted-foreground">
              {kpi.subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Constants ---

const PAY_KPI_IDS = [
  "pay-revenue",
  "pay-paid",
  "pay-pending",
  "pay-failed",
] as const;

const LIMIT_OPTIONS = [5, 10, 20];

// --- Component ---

const PaymentHistory = () => {
  const { t, i18n } = useTranslation(["admin", "common"]);
  const { formatCurrency } = useCurrency();
  const { user: authUser } = useAuth();
  const dateLocale =
    i18n.language === "pt-BR" || i18n.language === "pt" ? ptBR : enUS;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] =
    useState<SubscriptionHistory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // --- KPI DnD ---

  const kpiStorageKey = `admin-payments-kpi-order-${authUser?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === PAY_KPI_IDS.length &&
          PAY_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...PAY_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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

  const fetchPayments = async () => {
    try {
      const response = await adminApi.getPaymentHistory({ limit: 100 });
      setPayments(response.payments);
    } catch (error: any) {
      console.error("Failed to fetch payment data for KPIs:", error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getSubscriptionHistory({
        status: filterStatus !== "all" ? filterStatus : undefined,
        page,
        limit: pageSize,
      });
      setSubscriptions(response.history);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error("Failed to fetch subscription history:", error);
      toast({
        title: t("common:error"),
        description: t("admin:paymentHistory.errorLoadingSubscriptions"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscriptions();
    }, 300);
    return () => clearTimeout(timer);
  }, [filterStatus, page, pageSize, searchQuery]);

  // --- Filtering ---

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      subscription.user.email.toLowerCase().includes(query) ||
      subscription.user.name.toLowerCase().includes(query) ||
      subscription.planName.toLowerCase().includes(query) ||
      subscription.id.toLowerCase().includes(query)
    );
  });

  // --- KPI Computation ---

  const totalRevenue = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amountCents, 0);
  const paidCount = payments.filter((p) => p.status === "paid").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const failedCount = payments.filter((p) => p.status === "failed").length;

  const formatPrice = (cents: number) => formatCurrency(cents / 100);

  const kpiData = useMemo(
    () => ({
      "pay-revenue": {
        title: t("admin:paymentHistory.kpis.totalRevenue"),
        value: formatPrice(totalRevenue),
        subtitle: t("admin:paymentHistory.kpis.approvedPayments"),
        changeType: "positive" as const,
        icon: DollarSign,
        watermark: DollarSign,
      },
      "pay-paid": {
        title: t("admin:paymentHistory.kpis.paidPayments"),
        value: String(paidCount),
        subtitle: t("admin:paymentHistory.kpis.completed"),
        changeType: "positive" as const,
        icon: CreditCard,
        watermark: CreditCard,
      },
      "pay-pending": {
        title: t("admin:paymentHistory.kpis.pendingPayments"),
        value: String(pendingCount),
        subtitle: t("admin:paymentHistory.kpis.waiting"),
        changeType: "neutral" as const,
        icon: Clock,
        watermark: Clock,
      },
      "pay-failed": {
        title: t("admin:paymentHistory.kpis.failedPayments"),
        value: String(failedCount),
        subtitle: t("admin:paymentHistory.kpis.withError"),
        changeType: "negative" as const,
        icon: AlertTriangle,
        watermark: AlertTriangle,
      },
    }),
    [totalRevenue, paidCount, pendingCount, failedCount, t, formatCurrency],
  );

  // --- Helpers ---

  const handleDeleteSubscriptionClick = (
    subscription: SubscriptionHistory,
  ) => {
    setSubscriptionToDelete(subscription);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSubscription = async () => {
    if (!subscriptionToDelete) return;
    try {
      setDeleting(true);
      await adminApi.deleteSubscription(subscriptionToDelete.id);
      toast({
        title: t("common:success"),
        description: t("admin:paymentHistory.deleteSubscriptionSuccess"),
      });
      setIsDeleteDialogOpen(false);
      setSubscriptionToDelete(null);
      await fetchSubscriptions();
    } catch (err: any) {
      console.error("Error deleting subscription:", err);
      toast({
        title: t("common:error"),
        description:
          err?.error ||
          err?.response?.data?.error ||
          t("admin:paymentHistory.deleteSubscriptionError"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[100px] sm:h-[108px] rounded-xl bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={kpiSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleKpiDragEnd}
        >
          <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpiOrder.map((id) => (
                <SortablePayKpiCard
                  key={id}
                  id={id}
                  kpi={kpiData[id as keyof typeof kpiData]}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Main Content */}
      <ChartCard
        title={t("admin:paymentHistory.title")}
        subtitle={t("admin:paymentHistory.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("admin:paymentHistory.searchSubscriptions")}
                className="pl-8 h-8 w-48 text-sm bg-background/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[130px] text-sm bg-background/50">
                <SelectValue
                  placeholder={t("admin:paymentHistory.tableHeaders.status")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin:paymentHistory.filters.allStatus")}
                </SelectItem>
                <SelectItem value="paid">
                  {t("admin:paymentHistory.status.paid")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("admin:paymentHistory.status.pending")}
                </SelectItem>
                <SelectItem value="failed">
                  {t("admin:paymentHistory.status.failed")}
                </SelectItem>
                <SelectItem value="refunded">
                  {t("admin:paymentHistory.status.refunded")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {/* Subscriptions */}
        {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Package className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t("admin:paymentHistory.noSubscriptions")}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-3 font-medium text-foreground">
                          {t("admin:paymentHistory.tableHeaders.date")}
                        </th>
                        <th className="text-left p-3 font-medium text-foreground">
                          {t("admin:paymentHistory.tableHeaders.user")}
                        </th>
                        <th className="text-left p-3 font-medium text-foreground hidden sm:table-cell">
                          {t("common:plan")}
                        </th>
                        <th className="text-right p-3 font-medium text-foreground hidden md:table-cell">
                          {t("admin:paymentHistory.tableHeaders.price")}
                        </th>
                        <th className="text-left p-3 font-medium text-foreground">
                          {t("admin:paymentHistory.tableHeaders.status")}
                        </th>
                        <th className="p-3 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubscriptions.map((subscription) => (
                        <tr
                          key={subscription.id}
                          className="border-b border-white/10 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3">
                            <div className="text-sm text-foreground">
                              {format(
                                new Date(subscription.createdAt),
                                "dd/MM/yyyy",
                                { locale: dateLocale },
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(
                                new Date(subscription.createdAt),
                                "HH:mm:ss",
                                { locale: dateLocale },
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm font-medium text-foreground">
                              {subscription.user.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {subscription.user.email}
                            </div>
                          </td>
                          <td className="p-3 hidden sm:table-cell">
                            <span className="text-sm text-foreground">
                              {subscription.planName}
                            </span>
                          </td>
                          <td className="p-3 text-right hidden md:table-cell">
                            <span className="text-sm font-semibold text-foreground tabular-nums">
                              {formatPrice(subscription.priceCents)}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge
                              className={
                                subscription.status === "active"
                                  ? "bg-success/10 text-success"
                                  : subscription.status === "past_due"
                                    ? "bg-warning/10 text-warning"
                                    : subscription.status === "canceled"
                                      ? "bg-destructive/10 text-destructive"
                                      : subscription.status === "trialing"
                                        ? "bg-blue-500/10 text-blue-500"
                                        : "bg-muted text-muted-foreground"
                              }
                            >
                              {subscription.status === "active"
                                ? t("admin:subscriptions.status.active")
                                : subscription.status === "past_due"
                                  ? t("admin:subscriptions.status.pastDue")
                                  : subscription.status === "canceled"
                                    ? t("admin:subscriptions.status.cancelled")
                                    : subscription.status === "trialing"
                                      ? t("admin:subscriptions.status.trial")
                                      : subscription.status === "paused"
                                        ? t(
                                            "admin:subscriptions.status.paused",
                                          )
                                        : subscription.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                handleDeleteSubscriptionClick(subscription)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredSubscriptions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {t("common:showingResults", {
                            from: (page - 1) * pagination.limit + 1,
                            to: Math.min(
                              page * pagination.limit,
                              pagination.total,
                            ),
                            total: pagination.total,
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="subs-per-page"
                            className="text-sm text-muted-foreground whitespace-nowrap"
                          >
                            {t("common:perPage")}
                          </label>
                          <Select
                            value={String(pageSize)}
                            onValueChange={(v) => setPageSize(Number(v))}
                          >
                            <SelectTrigger
                              id="subs-per-page"
                              className="h-9 w-[110px]"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LIMIT_OPTIONS.map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {pagination.totalPages > 1 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPage((p) => Math.max(1, p - 1))
                            }
                            disabled={page <= 1 || loading}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {getPageNumbers().map((pageNum, idx) =>
                            pageNum === "..." ? (
                              <span
                                key={`ellipsis-${idx}`}
                                className="px-2 text-muted-foreground"
                              >
                                ...
                              </span>
                            ) : (
                              <Button
                                key={pageNum}
                                variant={
                                  page === (pageNum as number)
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setPage(pageNum as number)}
                                disabled={loading}
                                className="h-8 w-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            ),
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPage((p) =>
                                Math.min(pagination.totalPages, p + 1),
                              )
                            }
                            disabled={page >= pagination.totalPages || loading}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

      </ChartCard>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin:paymentHistory.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {subscriptionToDelete ? (
                <>
                  {t(
                    "admin:paymentHistory.deleteDialog.confirmSubscription",
                    { name: subscriptionToDelete.user.name },
                  )}
                  <br />
                  <span className="text-sm text-muted-foreground mt-2 block">
                    {t("common:plan")}: {subscriptionToDelete.planName}
                    <br />
                    {t("admin:paymentHistory.deleteDialog.price")}:{" "}
                    {formatPrice(subscriptionToDelete.priceCents)}
                    <br />
                    {t("admin:paymentHistory.deleteDialog.date")}:{" "}
                    {format(
                      new Date(subscriptionToDelete.createdAt),
                      t("admin:paymentHistory.dateTimeFormat"),
                      { locale: dateLocale },
                    )}
                  </span>
                </>
              ) : null}
              <br />
              {t("admin:paymentHistory.deleteDialog.warning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("common:cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubscription}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting
                ? t("admin:paymentHistory.deleteDialog.deleting")
                : t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentHistory;
