import { useState, useEffect, useMemo } from "react";
import {
  Search,
  LogIn,
  Shield,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
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

interface LoginHistoryEntry {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface LoginKpiDef {
  title: string;
  value: string;
  subtitle?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableLoginKpiCard({ id, kpi }: { id: string; kpi: LoginKpiDef }) {
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

const LOGIN_KPI_IDS = [
  "log-total",
  "log-success",
  "log-failed",
  "log-ips",
] as const;

const LIMIT_OPTIONS = [5, 10, 20];

// --- Component ---

const LoginHistory = () => {
  const { t, i18n } = useTranslation(["admin", "common"]);
  const { user: authUser } = useAuth();
  const dateLocale =
    i18n.language === "pt-BR" || i18n.language === "pt" ? ptBR : enUS;
  const [searchQuery, setSearchQuery] = useState("");
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] =
    useState<LoginHistoryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // --- KPI DnD ---

  const kpiStorageKey = `admin-login-history-kpi-order-${authUser?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === LOGIN_KPI_IDS.length &&
          LOGIN_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...LOGIN_KPI_IDS];
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

  useEffect(() => {
    const fetchLoginHistory = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getLoginHistory({
          page,
          limit: pageSize,
        });
        setLoginHistory(response.loginHistory);
        setPagination(response.pagination);
      } catch (error: any) {
        console.error("Failed to fetch login history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLoginHistory();
  }, [page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (searchQuery && page !== 1) {
      setPage(1);
    }
  }, [searchQuery]);

  // --- Filtering ---

  const filteredHistory = loginHistory.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.user.email.toLowerCase().includes(query) ||
      entry.user.name.toLowerCase().includes(query) ||
      entry.ipAddress?.toLowerCase().includes(query) ||
      entry.id.toLowerCase().includes(query)
    );
  });

  // --- KPI Computation ---

  const successfulLogins = loginHistory.filter((e) => e.success).length;
  const failedLogins = loginHistory.filter((e) => !e.success).length;
  const uniqueIPs = new Set(
    loginHistory.map((e) => e.ipAddress).filter(Boolean),
  ).size;

  const kpiData = useMemo(
    () => ({
      "log-total": {
        title: t("admin:loginHistory.stats.totalAttempts"),
        value: String(pagination.total),
        changeType: "neutral" as const,
        icon: LogIn,
        watermark: LogIn,
      },
      "log-success": {
        title: t("admin:loginHistory.stats.successful"),
        value: String(successfulLogins),
        changeType: "positive" as const,
        icon: CheckCircle2,
        watermark: CheckCircle2,
      },
      "log-failed": {
        title: t("admin:loginHistory.stats.failed"),
        value: String(failedLogins),
        changeType: "negative" as const,
        icon: XCircle,
        watermark: XCircle,
      },
      "log-ips": {
        title: t("admin:loginHistory.stats.uniqueIPs"),
        value: String(uniqueIPs),
        changeType: "neutral" as const,
        icon: Shield,
        watermark: Shield,
      },
    }),
    [pagination.total, successfulLogins, failedLogins, uniqueIPs, t],
  );

  // --- Helpers ---

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-destructive/10 text-destructive",
      consultant: "bg-primary/10 text-primary",
      customer: "bg-success/10 text-success",
    };
    const getRoleLabel = (r: string) => {
      if (r === "admin") return t("admin:userManagement.roles.admin");
      if (r === "consultant")
        return t("admin:userManagement.roles.consultant");
      if (r === "customer") return t("admin:userManagement.roles.customer");
      return r;
    };
    return (
      <Badge
        className={
          styles[role as keyof typeof styles] ||
          "bg-muted text-muted-foreground"
        }
      >
        {getRoleLabel(role)}
      </Badge>
    );
  };

  const handleDeleteClick = (record: LoginHistoryEntry) => {
    setRecordToDelete(record);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    try {
      setDeleting(true);
      await adminApi.deleteLoginHistory(recordToDelete.id);
      toast({
        title: t("common:success"),
        description: t("admin:loginHistory.deleteSuccess"),
      });
      setLoginHistory(
        loginHistory.filter((r) => r.id !== recordToDelete.id),
      );
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    } catch (err: any) {
      console.error("Error deleting login history record:", err);
      toast({
        title: t("common:error"),
        description: err?.error || t("admin:loginHistory.deleteError"),
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
                <SortableLoginKpiCard
                  key={id}
                  id={id}
                  kpi={kpiData[id as keyof typeof kpiData]}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Login History Table */}
      <ChartCard
        title={t("admin:loginHistory.title")}
        subtitle={t("admin:loginHistory.subtitle")}
        actions={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("admin:loginHistory.searchPlaceholder")}
              className="pl-8 h-8 w-52 text-sm bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
      >
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <LogIn className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t("admin:loginHistory.empty")}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-foreground">
                      {t("admin:loginHistory.tableHeaders.dateTime")}
                    </th>
                    <th className="text-left p-3 font-medium text-foreground">
                      {t("admin:loginHistory.tableHeaders.user")}
                    </th>
                    <th className="text-left p-3 font-medium text-foreground hidden sm:table-cell">
                      {t("admin:loginHistory.tableHeaders.role")}
                    </th>
                    <th className="text-left p-3 font-medium text-foreground hidden md:table-cell">
                      {t("admin:loginHistory.tableHeaders.ipAddress")}
                    </th>
                    <th className="text-left p-3 font-medium text-foreground hidden lg:table-cell">
                      {t("admin:loginHistory.tableHeaders.browserDevice")}
                    </th>
                    <th className="text-left p-3 font-medium text-foreground">
                      {t("admin:loginHistory.tableHeaders.status")}
                    </th>
                    <th className="p-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-white/10 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="text-sm text-foreground">
                          {format(
                            new Date(entry.createdAt),
                            "dd/MM/yyyy",
                            { locale: dateLocale },
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(
                            new Date(entry.createdAt),
                            "HH:mm:ss",
                            { locale: dateLocale },
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium text-foreground">
                          {entry.user.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.user.email}
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        {getRoleBadge(entry.user.role)}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <span className="text-sm font-mono text-foreground">
                          {entry.ipAddress || t("common:notAvailable")}
                        </span>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <span
                          className="text-xs text-muted-foreground"
                          title={entry.userAgent || ""}
                        >
                          {entry.userAgent
                            ? entry.userAgent.length > 50
                              ? entry.userAgent.substring(0, 50) + "..."
                              : entry.userAgent
                            : t("common:notAvailable")}
                        </span>
                      </td>
                      <td className="p-3">
                        {entry.success ? (
                          <Badge className="bg-success/10 text-success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t("admin:loginHistory.status.success")}
                          </Badge>
                        ) : (
                          <Badge className="bg-destructive/10 text-destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            {t("admin:loginHistory.status.failed")}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(entry)}
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
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {t("common:showingResults", {
                      from: (pagination.page - 1) * pagination.limit + 1,
                      to: Math.min(
                        pagination.page * pagination.limit,
                        pagination.total,
                      ),
                      total: pagination.total,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="login-per-page"
                      className="text-sm text-muted-foreground whitespace-nowrap"
                    >
                      {t("common:perPage")}
                    </label>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => setPageSize(Number(v))}
                    >
                      <SelectTrigger
                        id="login-per-page"
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
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
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
                            pagination.page === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setPage(pageNum as number)}
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
                      disabled={pagination.page === pagination.totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
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
              {t("admin:loginHistory.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin:loginHistory.deleteDialog.confirm", {
                name: recordToDelete?.user.name,
              })}
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                {t("admin:loginHistory.emailLabel")}:{" "}
                {recordToDelete?.user.email}
                <br />
                {t("admin:loginHistory.ipLabel")}:{" "}
                {recordToDelete?.ipAddress || t("common:notAvailable")}
                <br />
                {t("admin:loginHistory.deleteDialog.date")}:{" "}
                {recordToDelete &&
                  format(
                    new Date(recordToDelete.createdAt),
                    t("admin:loginHistory.dateTimeFormat"),
                    { locale: dateLocale },
                  )}
                <br />
                {t("admin:loginHistory.deleteDialog.status")}:{" "}
                {recordToDelete?.success
                  ? t("admin:loginHistory.status.success")
                  : t("admin:loginHistory.status.failed")}
              </span>
              <br />
              {t("admin:loginHistory.deleteDialog.warning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("common:cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecord}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting
                ? t("admin:loginHistory.deleteDialog.deleting")
                : t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LoginHistory;
