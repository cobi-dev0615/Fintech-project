import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trash2,
  CheckCheck,
  Eye,
  Bell,
  Mail,
  Calendar,
  Activity,
  GripVertical,
  TrendingUp,
  TrendingDown,
  RefreshCw,
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
import { Skeleton } from "@/components/ui/skeleton";
import { notificationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Notification {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  isRead: boolean;
  linkUrl: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

// --- KPI Card types & component ---

interface NotifKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableNotifKpiCard({
  id,
  kpi,
}: {
  id: string;
  kpi: NotifKpiDef;
}) {
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

// --- Helper functions ---

const getNotificationType = (notification: Notification): string => {
  if (notification.message.includes(":")) {
    return notification.message.split(":")[0].trim();
  }
  return notification.message;
};

const getNotificationContent = (
  notification: Notification
): string | null => {
  if (notification.metadata?.content) return notification.metadata.content;
  if (notification.metadata?.title) return notification.metadata.title;
  if (notification.message.includes(":")) {
    const parts = notification.message.split(":");
    if (parts.length > 1) return parts.slice(1).join(":").trim();
  }
  return null;
};

// --- KPI IDs ---

const NOTIF_KPI_IDS = [
  "notif-total",
  "notif-unread",
  "notif-today",
  "notif-read-rate",
] as const;

// --- Main component ---

const Notifications = () => {
  const { t, i18n } = useTranslation(["notifications", "common"]);
  const { toast } = useToast();
  const { user } = useAuth();
  const dateLocale = i18n.language?.startsWith("pt") ? ptBR : enUS;

  // --- Notification i18n translation helpers ---
  // Maps known hardcoded Portuguese titles to i18n keys (for existing DB records)
  const TITLE_KEY_MAP: Record<string, { titleKey: string; messageKey: string }> = {
    'Novo Comentário Recebido': { titleKey: 'websocket.newComment', messageKey: 'websocket.newCommentDesc' },
    'Nova Solicitação de Registro': { titleKey: 'websocket.newRegistration', messageKey: 'websocket.newRegistrationFullDesc' },
    'Conta Aprovada': { titleKey: 'websocket.accountApproved', messageKey: 'websocket.accountApprovedDesc' },
    'Solicitação de Registro Rejeitada': { titleKey: 'websocket.accountRejected', messageKey: 'websocket.accountRejectedDesc' },
    'Resposta ao seu Comentário': { titleKey: 'websocket.commentReplied', messageKey: 'websocket.commentRepliedDesc' },
    'Convite aceito': { titleKey: 'websocket.invitationAccepted', messageKey: 'websocket.invitationAcceptedFullDesc' },
    'Convite expirado': { titleKey: 'websocket.invitationExpired', messageKey: 'websocket.invitationExpiredConsultantDesc' },
  };

  const getTranslatedTitle = useCallback((notification: Notification): string => {
    // 1. Check metadata for explicit i18n key (new notifications)
    if (notification.metadata?.titleKey) {
      return t(`notifications:${notification.metadata.titleKey}`, notification.metadata.messageParams || {});
    }
    // 2. Fallback: map known Portuguese titles to i18n keys (existing DB records)
    const mapped = TITLE_KEY_MAP[notification.title];
    if (mapped) {
      return t(`notifications:${mapped.titleKey}`);
    }
    // 3. Raw title as last resort
    return notification.title;
  }, [t]);

  const getTranslatedMessage = useCallback((notification: Notification): string => {
    // 1. Check metadata for explicit i18n key (new notifications)
    if (notification.metadata?.messageKey) {
      return t(`notifications:${notification.metadata.messageKey}`, notification.metadata.messageParams || {});
    }
    // 2. Fallback: map by known title and use metadata params
    const mapped = TITLE_KEY_MAP[notification.title];
    if (mapped) {
      const params = {
        userName: notification.metadata?.userName,
        userEmail: notification.metadata?.userEmail,
        userRole: notification.metadata?.userRole,
        customerName: notification.metadata?.customerName,
        consultantName: notification.metadata?.consultantName,
        reason: notification.metadata?.reason,
        ...notification.metadata?.messageParams,
      };
      return t(`notifications:${mapped.messageKey}`, params);
    }
    // 3. Raw message as last resort
    return notification.message;
  }, [t]);

  // --- State ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // --- KPI drag order ---
  const kpiStorageKey = `notif-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === NOTIF_KPI_IDS.length &&
          NOTIF_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...NOTIF_KPI_IDS];
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

  // --- Data fetching ---

  const fetchNotifications = useCallback(
    async (pageNum: number = 1) => {
      try {
        setLoading(true);
        setLoadError(null);
        const response = await notificationsApi.getAll(pageNum, itemsPerPage);
        setNotifications(response.notifications);
        setCurrentPage(response.pagination.page);
        setTotalPages(response.pagination.totalPages);
        setTotal(response.pagination.total);
      } catch (error: any) {
        const status = error?.response?.status ?? error?.status;
        const isTimeout =
          status === 504 ||
          status === 408 ||
          /timeout|timed out/i.test(String(error?.message ?? ""));
        const message = isTimeout
          ? t("notifications:timeoutError")
          : t("notifications:loadError");
        setLoadError(message);
        toast({
          title: t("common:error"),
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage, t, toast]
  );

  // Fetch ALL notifications for KPI data
  const fetchKpiData = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll(1, 10000);
      setAllNotifications(data.notifications || []);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    fetchKpiData();
  }, [fetchKpiData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [currentPage, itemsPerPage, fetchNotifications]);

  // --- KPI computed values ---

  const kpiValues = useMemo(() => {
    const totalCount = allNotifications.length;
    const unreadCount = allNotifications.filter((n) => !n.isRead).length;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = allNotifications.filter((n) => {
      try {
        return n.createdAt.slice(0, 10) === today;
      } catch {
        return false;
      }
    }).length;
    const readRate =
      totalCount > 0
        ? (((totalCount - unreadCount) / totalCount) * 100).toFixed(1)
        : "0.0";
    return { totalCount, unreadCount, todayCount, readRate };
  }, [allNotifications]);

  const kpiData: Record<string, NotifKpiDef> = {
    "notif-total": {
      title: t("notifications:totalNotifications"),
      value: String(kpiValues.totalCount),
      changeType: "neutral",
      icon: Bell,
      watermark: Bell,
    },
    "notif-unread": {
      title: t("notifications:unreadNotifications"),
      value: String(kpiValues.unreadCount),
      change:
        kpiValues.unreadCount > 0
          ? `${kpiValues.unreadCount} ${t("notifications:filterUnread").toLowerCase()}`
          : undefined,
      changeType: kpiValues.unreadCount > 0 ? "negative" : "neutral",
      icon: Mail,
      watermark: Mail,
    },
    "notif-today": {
      title: t("notifications:todayNotifications"),
      value: String(kpiValues.todayCount),
      changeType: kpiValues.todayCount > 0 ? "positive" : "neutral",
      change: kpiValues.todayCount > 0 ? `+${kpiValues.todayCount}` : undefined,
      icon: Calendar,
      watermark: Calendar,
    },
    "notif-read-rate": {
      title: t("notifications:readRate"),
      value: `${kpiValues.readRate}%`,
      changeType:
        parseFloat(kpiValues.readRate) >= 80 ? "positive" : "negative",
      change:
        parseFloat(kpiValues.readRate) >= 80
          ? `${kpiValues.readRate}%`
          : `${kpiValues.readRate}%`,
      icon: CheckCheck,
      watermark: Activity,
    },
  };

  // --- Quick filters ---

  const quickFilters = [
    { key: "all", label: t("notifications:filterAll") },
    { key: "info", label: t("notifications:severity.info") },
    { key: "warning", label: t("notifications:severity.warning") },
    { key: "critical", label: t("notifications:severity.critical") },
    { key: "unread", label: t("notifications:filterUnread") },
  ];

  // Client-side filtering on paginated data
  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "unread")
      return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => n.severity === activeFilter);
  }, [notifications, activeFilter]);

  // --- Actions ---

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setAllNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      toast({
        title: t("common:error"),
        description: t("notifications:markReadError"),
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setAllNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      toast({
        title: t("common:success"),
        description: t("notifications:markAllReadSuccess"),
        variant: "success",
      });
    } catch {
      toast({
        title: t("common:error"),
        description: t("notifications:markAllReadError"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await notificationsApi.delete(deletingId);
      setDeletingId(null);
      if (notifications.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await fetchNotifications(currentPage);
      }
      fetchKpiData();
      toast({
        title: t("notifications:dropdown.removed"),
        description: t("notifications:deleteSuccess"),
        variant: "success",
      });
    } catch {
      toast({
        title: t("common:error"),
        description: t("notifications:deleteError"),
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    fetchNotifications(currentPage);
    fetchKpiData();
  };

  // --- Date formatting ---

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: dateLocale,
      });
    } catch {
      return "";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const locale = i18n.language?.startsWith("pt") ? "pt-BR" : "en-US";
      return new Date(dateString).toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // --- Severity badge ---

  const getNotificationTypeBadgeColor = (
    severity: "info" | "warning" | "critical"
  ) => {
    switch (severity) {
      case "info":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  const getNotificationTypeLabel = (
    severity: "info" | "warning" | "critical"
  ) => {
    return t(`notifications:severity.${severity}`);
  };

  // --- Detail dialog ---

  const handleViewDetail = (
    notification: Notification,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    setSelectedNotification(notification);
    setIsDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailDialogOpen(false);
    setSelectedNotification(null);
  };

  const handleNavigateToLink = () => {
    if (selectedNotification?.linkUrl) {
      window.location.href = selectedNotification.linkUrl;
    }
  };

  // --- Pagination ---

  const handlePageChange = (page: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage <= 3) {
        for (let i = 2; i <= 4; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++)
          pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // --- Render ---

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
              return <SortableNotifKpiCard key={id} id={id} kpi={kpi} />;
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {quickFilters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setActiveFilter(filter.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeFilter === filter.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Error state with retry */}
      {loadError && !loading && (
        <div className="chart-card flex flex-col items-center justify-center py-8 text-center">
          <Bell className="h-12 w-12 text-destructive/70 mb-4" />
          <p className="text-sm font-medium text-foreground mb-1">
            {t("notifications:loadFailed")}
          </p>
          <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications(currentPage)}
          >
            {t("notifications:retry")}
          </Button>
        </div>
      )}

      {/* Main Content Card */}
      {!loadError && (
        <div className="chart-card space-y-4">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {t("notifications:allNotifications")}
            </h2>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkAllAsRead}
                  className="gap-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  {t("notifications:markAllRead")}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                {t("notifications:refresh")}
              </Button>
            </div>
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block min-w-0">
            {loading && notifications.length === 0 ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded shrink-0" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-4 w-full max-w-xs" />
                      <Skeleton className="h-3 w-full max-w-md" />
                    </div>
                    <Skeleton className="h-4 w-24 shrink-0" />
                    <Skeleton className="h-8 w-16 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-14 text-center text-muted-foreground font-medium">
                        {t("notifications:tableHeaders.number")}
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        {t("notifications:tableHeaders.type")}
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        {t("notifications:tableHeaders.content")}
                      </TableHead>
                      <TableHead className="w-40 text-muted-foreground font-medium">
                        {t("notifications:tableHeaders.date")}
                      </TableHead>
                      <TableHead className="w-40 text-right text-muted-foreground font-medium">
                        {t("notifications:tableHeaders.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.length === 0 ? (
                      <TableRow className="hover:bg-transparent border-0">
                        <TableCell colSpan={5} className="p-0 border-0">
                          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-sm font-medium text-foreground">
                              {t("notifications:noNotifications")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                              {t("notifications:noNotificationsDesc")}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNotifications.map((notification, index) => (
                        <TableRow
                          key={notification.id}
                          className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                            !notification.isRead ? "bg-primary/5" : ""
                          }`}
                        >
                          <TableCell className="w-16 text-center text-sm text-muted-foreground">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getNotificationTypeBadgeColor(
                                notification.severity
                              )}`}
                            >
                              {getNotificationTypeLabel(notification.severity)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p
                                className={`text-sm font-medium ${
                                  !notification.isRead
                                    ? "text-primary"
                                    : "text-foreground"
                                }`}
                              >
                                {getTranslatedTitle(notification)}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2 max-w-lg">
                                {getTranslatedMessage(notification)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="w-40">
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(notification.createdAt)}
                              </span>
                              <span className="text-xs text-muted-foreground/70">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="w-40 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={(e) =>
                                  handleViewDetail(notification, e)
                                }
                                title={t("notifications:viewDetails")}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(notification.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Mobile: Card list */}
          <div className="md:hidden space-y-3 min-w-0">
            {loading && notifications.length === 0 ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground">
                  {t("notifications:noNotifications")}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  {t("notifications:noNotificationsMobileDesc")}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`rounded-xl border p-4 space-y-3 transition-colors ${
                    !notification.isRead
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getNotificationTypeBadgeColor(
                        notification.severity
                      )}`}
                    >
                      {getNotificationTypeLabel(notification.severity)}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      #{(currentPage - 1) * itemsPerPage + index + 1}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        !notification.isRead
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {getTranslatedTitle(notification)}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 break-words">
                      {getTranslatedMessage(notification)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => handleViewDetail(notification, e)}
                        aria-label={t("notifications:viewDetails")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(notification.id);
                        }}
                        aria-label={t("notifications:remove")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border min-w-0">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
              <p
                className="text-sm text-muted-foreground min-w-0 break-words"
                aria-live="polite"
              >
                {t("notifications:showing")}{" "}
                {notifications.length > 0
                  ? (currentPage - 1) * itemsPerPage + 1
                  : 0}{" "}
                {t("notifications:to")}{" "}
                {Math.min(currentPage * itemsPerPage, total)}{" "}
                {t("notifications:of")} {total}{" "}
                {t("notifications:notifications")}
              </p>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="items-per-page"
                  className="text-sm text-muted-foreground whitespace-nowrap"
                >
                  {t("notifications:itemsPerPage")}
                </label>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    id="items-per-page"
                    className="w-[4.5rem] h-9"
                    aria-label={t("notifications:itemsPerPage")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="min-w-0 max-w-full overflow-x-hidden flex justify-end">
                <Pagination>
                  <PaginationContent className="flex-wrap justify-center gap-2 sm:gap-1">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => handlePageChange(currentPage - 1, e)}
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                        href="#"
                      />
                    </PaginationItem>
                    {getPageNumbers().map((pageNum, index) => (
                      <PaginationItem key={index}>
                        {pageNum === "ellipsis" ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={(e) => handlePageChange(pageNum, e)}
                            isActive={pageNum === currentPage}
                            className="cursor-pointer"
                            href="#"
                          >
                            {pageNum}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => handlePageChange(currentPage + 1, e)}
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                        href="#"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedNotification
                ? getTranslatedTitle(selectedNotification)
                : t("notifications:detail.title")}
            </DialogTitle>
            <DialogDescription>
              {t("notifications:detail.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("notifications:detail.type")}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getNotificationTypeBadgeColor(
                      selectedNotification.severity
                    )}`}
                  >
                    {getNotificationTypeLabel(selectedNotification.severity)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("notifications:detail.statusLabel")}
                  </span>
                  <span
                    className={`text-sm ${selectedNotification.isRead ? "text-success" : "text-warning"}`}
                  >
                    {selectedNotification.isRead
                      ? t("notifications:detail.read")
                      : t("notifications:detail.unread")}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("notifications:detail.message")}
                </span>
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm whitespace-pre-wrap">
                  {getTranslatedMessage(selectedNotification)}
                </div>
              </div>
              {(() => {
                const content = getNotificationContent(selectedNotification);
                const hasMetadata =
                  selectedNotification.metadata &&
                  Object.keys(selectedNotification.metadata).length > 0;

                if (content && content.trim() !== "") {
                  return (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t("notifications:detail.additionalInfo")}
                      </span>
                      <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm whitespace-pre-wrap">
                        {content}
                      </div>
                      {hasMetadata &&
                        Object.keys(selectedNotification.metadata).filter(
                          (k) => k !== "content" && k !== "title"
                        ).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              {t("notifications:detail.viewMetadata")}
                            </summary>
                            <pre className="text-xs text-foreground overflow-auto mt-2 p-2 bg-muted/20 rounded">
                              {JSON.stringify(
                                selectedNotification.metadata,
                                null,
                                2
                              )}
                            </pre>
                          </details>
                        )}
                    </div>
                  );
                }
                return null;
              })()}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("notifications:detail.createdAt")}
                </span>
                <div className="text-sm text-foreground">
                  <div>{formatDate(selectedNotification.createdAt)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTimeAgo(selectedNotification.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDetail}>
              {t("common:close")}
            </Button>
            {selectedNotification?.linkUrl && (
              <Button onClick={handleNavigateToLink}>
                {t("notifications:detail.goToLink")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("notifications:deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("notifications:deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("notifications:remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notifications;
