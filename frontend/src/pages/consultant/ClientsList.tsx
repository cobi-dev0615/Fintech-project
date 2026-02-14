import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  UserCheck,
  Clock,
  Wallet,
  ChevronRight,
  GripVertical,
  TrendingUp,
  TrendingDown,
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
import ChartCard from "@/components/dashboard/ChartCard";
import { consultantApi } from "@/lib/api-consultant";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";

// --- Types ---

type Client = {
  id: string;
  name: string;
  email: string;
  netWorth: number;
  status: string;
  lastContact: string;
  walletShared: boolean;
};

interface CliKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableCliKpiCard({ id, kpi }: { id: string; kpi: CliKpiDef }) {
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
          {kpi.change && kpi.changeType !== "neutral" && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`flex items-center gap-0.5 ${
                  kpi.changeType === "positive" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {kpi.changeType === "positive" ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-semibold tabular-nums">{kpi.change}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- KPI IDs ---

const CLIENTS_KPI_IDS = ["cli-total", "cli-active", "cli-net-worth", "cli-pending"] as const;

// --- Helpers ---

function getStatusBadgeClass(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "active") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (s === "pending") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-muted text-muted-foreground border-border";
}

// --- Component ---

const ClientsList = () => {
  const { t } = useTranslation(["consultant", "common"]);
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // --- Data ---

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["consultant-clients", search, status, page, limit],
    queryFn: () =>
      consultantApi.getClients({
        search: search || undefined,
        status: status || undefined,
        page,
        limit,
      }),
    placeholderData: (prev) => prev,
  });

  const clients = (data?.clients ?? []) as Client[];
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 };

  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  const getStatusLabel = (s: string) =>
    t(`consultant:clients.status.${(s || "").toLowerCase()}`, { defaultValue: s });

  // --- KPI DnD ---

  const kpiStorageKey = `clients-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === CLIENTS_KPI_IDS.length &&
          CLIENTS_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...CLIENTS_KPI_IDS];
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

  // --- KPI Data ---

  const totalClients = pagination.total;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const totalNetWorth = clients.reduce((sum, c) => sum + (c.netWorth || 0), 0);
  const pendingClients = clients.filter((c) => c.status === "pending").length;

  const kpiMap: Record<string, CliKpiDef> = {
    "cli-total": {
      title: t("consultant:dashboard.kpis.totalClients"),
      value: totalClients.toString(),
      changeType: "neutral",
      icon: Users,
      watermark: Users,
    },
    "cli-active": {
      title: t("consultant:clients.status.active"),
      value: activeClients.toString(),
      changeType: "neutral",
      icon: UserCheck,
      watermark: UserCheck,
    },
    "cli-net-worth": {
      title: t("consultant:clients.tableHeaders.netWorth"),
      value: formatCurrency(totalNetWorth),
      changeType: "neutral",
      icon: TrendingUp,
      watermark: Wallet,
    },
    "cli-pending": {
      title: t("consultant:clients.status.pending"),
      value: pendingClients.toString(),
      changeType: "neutral",
      icon: Clock,
      watermark: Clock,
    },
  };

  // --- Render ---

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Grid */}
      <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiOrder.map((id) => (
              <SortableCliKpiCard key={id} id={id} kpi={kpiMap[id]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Clients Table */}
      <ChartCard
        title={t("consultant:clients.title")}
        subtitle={t("consultant:clients.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("consultant:clients.searchPlaceholder")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-8 w-32 sm:w-48 text-sm rounded-lg bg-muted/30 border-border focus-visible:ring-2"
              />
            </div>
            <Select
              value={status || "all"}
              onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}
            >
              <SelectTrigger className="h-8 w-[120px] sm:w-[140px] text-sm rounded-lg bg-muted/30 border-border">
                <SelectValue placeholder={t("consultant:clients.tableHeaders.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("consultant:clients.allStatus")}</SelectItem>
                <SelectItem value="active">{t("consultant:clients.status.active")}</SelectItem>
                <SelectItem value="inactive">{t("consultant:clients.status.inactive")}</SelectItem>
                <SelectItem value="pending">{t("consultant:clients.status.pending")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {isLoading && clients.length === 0 ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-4 w-48 flex-1 max-w-xs rounded bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
                <div className="h-8 w-14 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-destructive/70 mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">
              {t("consultant:clients.loadError")}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {(error as { error?: string })?.error || t("consultant:clients.tryAgain")}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("common:tryAgain")}
            </Button>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-foreground">
              {t("consultant:clients.empty")}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {t("consultant:clients.emptyDesc")}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-border">
                    <TableHead className="font-medium text-muted-foreground">
                      {t("consultant:clients.tableHeaders.name")}
                    </TableHead>
                    <TableHead className="font-medium text-muted-foreground">
                      {t("consultant:clients.tableHeaders.email")}
                    </TableHead>
                    <TableHead className="text-right font-medium text-muted-foreground">
                      {t("consultant:clients.tableHeaders.netWorth")}
                    </TableHead>
                    <TableHead className="font-medium text-muted-foreground">
                      {t("consultant:clients.tableHeaders.status")}
                    </TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-muted-foreground">{client.email}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(client.netWorth)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full text-xs font-medium border",
                            getStatusBadgeClass(client.status)
                          )}
                        >
                          {getStatusLabel(client.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => navigate(`/consultant/clients/${client.id}`)}
                        >
                          {t("consultant:clients.actions.view")}
                          <ChevronRight className="h-4 w-4 ml-0.5 shrink-0" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination.total > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {t("consultant:clients.showing", {
                    start: startItem,
                    end: endItem,
                    total: pagination.total,
                  })}{" "}
                  {t("consultant:clients.clientCount", { count: pagination.total })}
                </p>
                {pagination.totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t("common:previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t("common:next")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </ChartCard>
    </div>
  );
};

export default ClientsList;
