import { useState, useEffect, useMemo } from "react";
import {
  Search,
  TrendingUp,
  DollarSign,
  Users,
  ArrowRight,
  Target,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- Types ---

interface Prospect {
  id: string;
  name: string;
  email: string;
  netWorth: number;
  stage: "free" | "basic" | "pro" | "consultant";
  engagement: number;
  lastActivity: string;
  potential: "high" | "medium" | "low";
}

interface ProspectKpiDef {
  title: string;
  value: string;
  subtitle?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableProspectKpiCard({
  id,
  kpi,
}: {
  id: string;
  kpi: ProspectKpiDef;
}) {
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

const PROSPECT_KPI_IDS = [
  "prs-total",
  "prs-high",
  "prs-net-worth",
  "prs-engagement",
] as const;

const LIMIT_OPTIONS = [5, 10, 20];

// --- Component ---

const DAMAProspecting = () => {
  const { t } = useTranslation(["admin", "common"]);
  const { formatCurrency } = useCurrency();
  const { user: authUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterPotential, setFilterPotential] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [kpis, setKpis] = useState({
    highPotential: 0,
    totalNetWorth: 0,
    avgEngagement: 0,
    total: 0,
  });
  const [funnelData, setFunnelData] = useState({
    free: 0,
    basic: 0,
    pro: 0,
    consultant: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  // --- KPI DnD ---

  const kpiStorageKey = `admin-prospecting-kpi-order-${authUser?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === PROSPECT_KPI_IDS.length &&
          PROSPECT_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...PROSPECT_KPI_IDS];
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
    setPage(1);
  }, [searchQuery, filterStage, filterPotential]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getProspecting({
        search: searchQuery || undefined,
        stage: filterStage !== "all" ? filterStage : undefined,
        potential: filterPotential !== "all" ? filterPotential : undefined,
        page,
        limit: pageSize,
      });
      setProspects((data.prospects || []) as Prospect[]);
      setKpis(
        data.kpis ?? {
          highPotential: 0,
          totalNetWorth: 0,
          avgEngagement: 0,
          total: 0,
        },
      );
      setFunnelData(
        data.funnel ?? { free: 0, basic: 0, pro: 0, consultant: 0 },
      );
      setPagination(
        data.pagination ?? {
          page: 1,
          limit: pageSize,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (err) {
      console.error("Failed to fetch prospects:", err);
      setProspects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchProspects(), 300);
    return () => clearTimeout(timer);
  }, [page, pageSize, searchQuery, filterStage, filterPotential]);

  // --- KPI Computation ---

  const kpiData = useMemo(
    () => ({
      "prs-total": {
        title: t("admin:prospecting.kpis.totalProspects"),
        value: String(pagination.total),
        subtitle: t("admin:prospecting.kpis.page", { page: pagination.page }),
        changeType: "neutral" as const,
        icon: Users,
        watermark: Users,
      },
      "prs-high": {
        title: t("admin:prospecting.kpis.highPotential"),
        value: String(kpis.highPotential),
        changeType: "positive" as const,
        icon: Target,
        watermark: Target,
      },
      "prs-net-worth": {
        title: t("admin:prospecting.kpis.totalNetWorth"),
        value: formatCurrency(kpis.totalNetWorth ?? 0),
        changeType: "neutral" as const,
        icon: DollarSign,
        watermark: DollarSign,
      },
      "prs-engagement": {
        title: t("admin:prospecting.kpis.avgEngagement"),
        value: `${(kpis.avgEngagement ?? 0).toFixed(0)}%`,
        changeType: "neutral" as const,
        icon: TrendingUp,
        watermark: TrendingUp,
      },
    }),
    [kpis, pagination, t, formatCurrency],
  );

  // --- Helpers ---

  const getStageBadge = (stage: string) => {
    const styles: Record<string, string> = {
      free: "bg-muted text-muted-foreground",
      basic: "bg-blue-500/10 text-blue-500",
      pro: "bg-primary/10 text-primary",
      consultant: "bg-emerald-500/10 text-emerald-500",
    };
    const getStageLabel = (s: string) => {
      if (s === "free") return t("admin:prospecting.stages.free");
      if (s === "basic") return t("admin:prospecting.stages.basic");
      if (s === "pro") return t("admin:prospecting.stages.pro");
      if (s === "consultant") return t("admin:prospecting.stages.consultant");
      return s;
    };
    return (
      <Badge className={styles[stage] ?? styles.free}>
        {getStageLabel(stage)}
      </Badge>
    );
  };

  const getPotentialBadge = (potential: string) => {
    const styles: Record<string, string> = {
      high: "bg-success/10 text-success",
      medium: "bg-amber-500/10 text-amber-500",
      low: "bg-muted text-muted-foreground",
    };
    const getPotentialLabel = (p: string) => {
      if (p === "high") return t("admin:prospecting.potential.high");
      if (p === "medium") return t("admin:prospecting.potential.medium");
      if (p === "low") return t("admin:prospecting.potential.low");
      return p;
    };
    return (
      <Badge className={styles[potential] ?? styles.low}>
        {getPotentialLabel(potential)}
      </Badge>
    );
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
                <SortableProspectKpiCard
                  key={id}
                  id={id}
                  kpi={kpiData[id as keyof typeof kpiData]}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Funnel + Prospects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Card */}
        <ChartCard
          title={t("admin:prospecting.funnelCard.title")}
          subtitle={t("admin:prospecting.funnelCard.subtitle")}
        >
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(funnelData).map(([stage, count]) => {
                const total = Object.values(funnelData).reduce(
                  (a, b) => a + b,
                  0,
                );
                const pct = total > 0 ? (count / total) * 100 : 0;
                const stageLabel =
                  stage === "free"
                    ? t("admin:prospecting.stages.free")
                    : stage === "basic"
                      ? t("admin:prospecting.stages.basic")
                      : stage === "pro"
                        ? t("admin:prospecting.stages.pro")
                        : stage === "consultant"
                          ? t("admin:prospecting.stages.consultant")
                          : stage;
                return (
                  <div key={stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium">
                        {stageLabel}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Prospects Table */}
        <div className="lg:col-span-2">
          <ChartCard
            title={t("admin:prospecting.title")}
            subtitle={t("admin:prospecting.subtitle")}
            actions={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t("admin:prospecting.searchPlaceholder")}
                    className="pl-8 h-8 w-40 text-sm bg-background/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterStage} onValueChange={setFilterStage}>
                  <SelectTrigger className="h-8 w-[120px] text-sm bg-background/50">
                    <SelectValue
                      placeholder={t("admin:prospecting.filters.stage")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("admin:prospecting.filters.allStages")}
                    </SelectItem>
                    <SelectItem value="free">
                      {t("admin:prospecting.stages.free")}
                    </SelectItem>
                    <SelectItem value="basic">
                      {t("admin:prospecting.stages.basic")}
                    </SelectItem>
                    <SelectItem value="pro">
                      {t("admin:prospecting.stages.pro")}
                    </SelectItem>
                    <SelectItem value="consultant">
                      {t("admin:prospecting.stages.consultant")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterPotential}
                  onValueChange={setFilterPotential}
                >
                  <SelectTrigger className="h-8 w-[120px] text-sm bg-background/50">
                    <SelectValue
                      placeholder={t("admin:prospecting.filters.potential")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("admin:prospecting.filters.allPotential")}
                    </SelectItem>
                    <SelectItem value="high">
                      {t("admin:prospecting.potential.high")}
                    </SelectItem>
                    <SelectItem value="medium">
                      {t("admin:prospecting.potential.medium")}
                    </SelectItem>
                    <SelectItem value="low">
                      {t("admin:prospecting.potential.low")}
                    </SelectItem>
                  </SelectContent>
                </Select>
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
            ) : prospects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t("admin:prospecting.empty")}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-3 font-medium text-foreground">
                          {t("admin:prospecting.tableHeaders.name")}
                        </th>
                        <th className="text-left p-3 font-medium text-foreground hidden md:table-cell">
                          {t("admin:prospecting.tableHeaders.email")}
                        </th>
                        <th className="text-left p-3 font-medium text-foreground">
                          {t("admin:prospecting.tableHeaders.stage")}
                        </th>
                        <th className="text-left p-3 font-medium text-foreground hidden sm:table-cell">
                          {t("admin:prospecting.tableHeaders.potential")}
                        </th>
                        <th className="text-right p-3 font-medium text-foreground hidden lg:table-cell">
                          {t("admin:prospecting.tableHeaders.netWorth")}
                        </th>
                        <th className="text-right p-3 font-medium text-foreground hidden lg:table-cell">
                          {t("admin:prospecting.tableHeaders.engagement")}
                        </th>
                        <th className="p-3 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {prospects.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3 font-medium text-foreground">
                            {p.name}
                          </td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">
                            {p.email}
                          </td>
                          <td className="p-3">{getStageBadge(p.stage)}</td>
                          <td className="p-3 hidden sm:table-cell">
                            {getPotentialBadge(p.potential)}
                          </td>
                          <td className="p-3 text-right tabular-nums hidden lg:table-cell">
                            {formatCurrency(p.netWorth ?? 0)}
                          </td>
                          <td className="p-3 text-right hidden lg:table-cell">
                            {p.engagement ?? 0}%
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedProspect(p);
                                setDetailOpen(true);
                              }}
                              aria-label={t("admin:prospecting.viewDetails")}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 0 && (
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
                            htmlFor="prospects-per-page"
                            className="text-sm text-muted-foreground whitespace-nowrap"
                          >
                            {t("common:perPage")}
                          </label>
                          <Select
                            value={String(pageSize)}
                            onValueChange={(v) => setPageSize(Number(v))}
                          >
                            <SelectTrigger
                              id="prospects-per-page"
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
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setPage((p) => Math.max(1, p - 1))
                            }
                            disabled={page <= 1 || loading}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {Array.from(
                            {
                              length: Math.min(
                                5,
                                Math.max(1, pagination.totalPages),
                              ),
                            },
                            (_, i) => {
                              let pageNum: number;
                              const totalP = Math.max(
                                1,
                                pagination.totalPages,
                              );
                              if (totalP <= 5) {
                                pageNum = i + 1;
                              } else if (page <= 3) {
                                pageNum = i + 1;
                              } else if (page >= totalP - 2) {
                                pageNum = totalP - 4 + i;
                              } else {
                                pageNum = page - 2 + i;
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={
                                    page === pageNum ? "default" : "outline"
                                  }
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setPage(pageNum)}
                                  disabled={loading}
                                >
                                  {pageNum}
                                </Button>
                              );
                            },
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setPage((p) =>
                                Math.min(
                                  Math.max(1, pagination.totalPages),
                                  p + 1,
                                ),
                              )
                            }
                            disabled={
                              page >= Math.max(1, pagination.totalPages) ||
                              loading
                            }
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
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("admin:prospecting.detailDialog.title")}
            </DialogTitle>
          </DialogHeader>
          {selectedProspect && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">
                  {t("admin:prospecting.detailDialog.name")}:
                </span>{" "}
                {selectedProspect.name}
              </p>
              <p>
                <span className="text-muted-foreground">
                  {t("admin:prospecting.detailDialog.email")}:
                </span>{" "}
                {selectedProspect.email}
              </p>
              <p>
                <span className="text-muted-foreground">
                  {t("admin:prospecting.detailDialog.stage")}:
                </span>{" "}
                {getStageBadge(selectedProspect.stage)}
              </p>
              <p>
                <span className="text-muted-foreground">
                  {t("admin:prospecting.detailDialog.potential")}:
                </span>{" "}
                {getPotentialBadge(selectedProspect.potential)}
              </p>
              <p>
                <span className="text-muted-foreground">
                  {t("admin:prospecting.detailDialog.netWorth")}:
                </span>{" "}
                {formatCurrency(selectedProspect.netWorth ?? 0)}
              </p>
              <p>
                <span className="text-muted-foreground">
                  {t("admin:prospecting.detailDialog.engagement")}:
                </span>{" "}
                {selectedProspect.engagement ?? 0}%
              </p>
              <p>
                <span className="text-muted-foreground">
                  {t("admin:prospecting.detailDialog.lastActivity")}:
                </span>{" "}
                {selectedProspect.lastActivity || "—"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DAMAProspecting;
