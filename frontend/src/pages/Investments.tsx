import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  RefreshCw,
  Building2,
  Link2,
  ArrowRight,
  Wallet,
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
import ChartCard from "@/components/dashboard/ChartCard";
import { Skeleton } from "@/components/ui/skeleton";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Label,
} from "recharts";

const TYPE_COLORS: Record<string, string> = {
  fund: "#8b5cf6",
  cdb: "#10b981",
  lci: "#06b6d4",
  lca: "#0ea5e9",
  stock: "#3b82f6",
  etf: "#f59e0b",
  reit: "#ec4899",
  other: "#6b7280",
};

// --- KPI Card types & component ---

interface InvKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableInvKpiCard({ id, kpi }: { id: string; kpi: InvKpiDef }) {
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

// --- KPI IDs ---

const INVESTMENTS_KPI_IDS = [
  "inv-total",
  "inv-positions",
  "inv-types",
  "inv-avg",
] as const;

const Investments = () => {
  const { t } = useTranslation(['investments', 'common']);
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      fund: t('investments:typeLabels.fund'),
      cdb: t('investments:typeLabels.cdb'),
      lci: t('investments:typeLabels.lci'),
      lca: t('investments:typeLabels.lca'),
      stock: t('investments:typeLabels.stock'),
      etf: t('investments:typeLabels.etf'),
      reit: t('investments:typeLabels.reit'),
      other: t('investments:typeLabels.other'),
    };
    return typeMap[type] || type;
  };

  const [investments, setInvestments] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- KPI drag order ---
  const kpiStorageKey = `investments-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === INVESTMENTS_KPI_IDS.length &&
          INVESTMENTS_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...INVESTMENTS_KPI_IDS];
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financeApi
        .getInvestments()
        .catch(() => ({ investments: [], total: 0, breakdown: [] }));

      setInvestments(data.investments || []);
      setTotalValue(typeof data.total === "number" ? data.total : 0);
      setBreakdown(data.breakdown || []);
      setError(null);
    } catch (err: any) {
      setError(err?.error || t('investments:errorLoading'));
      console.error("Error fetching investments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchData();
      toast({
        title: t('common:syncComplete'),
        description: t('investments:syncSuccess'),
      });
    } catch (err: any) {
      toast({
        title: t('common:syncError'),
        description: err?.error || t('common:syncErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const allocationData = breakdown
    .filter((b) => b.total > 0)
    .map((b) => ({
      name: getTypeLabel(b.type),
      value: parseFloat(b.total) || 0,
      color: TYPE_COLORS[b.type] || TYPE_COLORS.other,
    }));

  // --- KPI computed values ---
  const positionCount = investments.length;
  const typeCount = breakdown.length;
  const avgPosition = positionCount > 0 ? totalValue / positionCount : 0;

  const kpiData: Record<string, InvKpiDef> = {
    "inv-total": {
      title: t("investments:kpi.totalValue"),
      value: formatCurrency(totalValue),
      change: totalValue !== 0
        ? t("investments:kpi.openFinance")
        : undefined,
      changeType: totalValue > 0 ? "positive" : totalValue < 0 ? "negative" : "neutral",
      icon: TrendingUp,
      watermark: TrendingUp,
    },
    "inv-positions": {
      title: t("investments:kpi.positions"),
      value: String(positionCount),
      change: positionCount > 0
        ? t("investments:kpi.assets", { count: positionCount })
        : undefined,
      changeType: positionCount > 0 ? "positive" : "neutral",
      icon: PieChartIcon,
      watermark: PieChartIcon,
    },
    "inv-types": {
      title: t("investments:kpi.types"),
      value: String(typeCount),
      change: typeCount > 0
        ? t("investments:kpi.categories", { count: typeCount })
        : undefined,
      changeType: typeCount > 0 ? "positive" : "neutral",
      icon: Building2,
      watermark: Building2,
    },
    "inv-avg": {
      title: t("investments:kpi.avgPosition"),
      value: formatCurrency(avgPosition),
      change: avgPosition !== 0
        ? t("investments:kpi.perPosition")
        : undefined,
      changeType: avgPosition > 0 ? "positive" : avgPosition < 0 ? "negative" : "neutral",
      icon: Wallet,
      watermark: Wallet,
    },
  };

  // --- KPI grid JSX (reused in loading/error states) ---
  const kpiGrid = (
    <DndContext
      sensors={kpiSensors}
      collisionDetection={closestCenter}
      onDragEnd={handleKpiDragEnd}
    >
      <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiOrder.map((id) => {
            const kpi = kpiData[id];
            if (!kpi) return null;
            return <SortableInvKpiCard key={id} id={id} kpi={kpi} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

  // Show loading
  if (loading) {
    return (
      <div className="space-y-6 min-w-0">
        {kpiGrid}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg w-full" />
          <Skeleton className="h-64 rounded-lg w-full" />
        </div>
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <div className="space-y-6 min-w-0">
        {kpiGrid}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchData()}>
            {t('common:tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      {kpiGrid}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Chart */}
        {allocationData.length > 0 && (
          <ChartCard title={t('investments:allocationByType')} subtitle={t('investments:allocationSubtitle')}>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={false}
                  >
                    {allocationData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                    <Label
                      content={({ viewBox }: { viewBox?: { cx?: number; cy?: number } }) => {
                        const cx = viewBox?.cx ?? 0;
                        const cy = viewBox?.cy ?? 0;
                        const first = allocationData[0];
                        if (allocationData.length === 1 && first) {
                          return (
                            <g>
                              <text x={cx} y={cy} textAnchor="middle" fill="white" className="text-sm font-medium">
                                {first.name}: {formatCurrency(first.value)}
                              </text>
                            </g>
                          );
                        }
                        return (
                          <g>
                            <text x={cx} y={cy - 6} textAnchor="middle" fill="white" className="text-sm font-medium">
                              {t('common:total')}
                            </text>
                            <text x={cx} y={cy + 10} textAnchor="middle" fill="white" className="text-sm font-bold">
                              {formatCurrency(totalValue)}
                            </text>
                          </g>
                        );
                      }}
                    />
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {allocationData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}

        {/* Positions Table */}
        <ChartCard
          title={t('investments:positionsOpenFinance')}
          subtitle={investments.length > 0 ? t('investments:positionCount', { count: investments.length }) : undefined}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
              {syncing ? t('common:syncing') : t('common:sync')}
            </Button>
          }
        >
          {investments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 sm:py-16">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 text-primary" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{t('investments:noInvestments')}</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                {t('investments:noInvestmentsDesc')}
              </p>
              <Link to="/app/connections/open-finance">
                <Button className="gap-2">
                  <Link2 className="h-4 w-4" />
                  {t('investments:goToConnections')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-4">
                {t('investments:sidebarTip')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('investments:tableHeaders.asset')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('investments:tableHeaders.type')}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('investments:tableHeaders.quantity')}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('investments:tableHeaders.unitPrice')}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('investments:tableHeaders.currentValue')}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('investments:tableHeaders.profitability')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv: any) => {
                    const value = parseFloat(inv.current_value || 0);
                    const qty = parseFloat(inv.quantity || 0);
                    const unitPrice = parseFloat(inv.unit_price || 0);
                    const profitability = inv.profitability != null ? parseFloat(inv.profitability) : null;
                    return (
                      <tr
                        key={inv.id || inv.pluggy_investment_id}
                        className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {inv.name || "—"}
                            </p>
                            {inv.institution_name && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {inv.institution_name}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {getTypeLabel(inv.type) || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm tabular-nums">
                          {qty > 0 ? qty.toLocaleString("pt-BR") : "—"}
                        </td>
                        <td className="py-3 px-4 text-right text-sm tabular-nums">
                          {unitPrice > 0
                            ? formatCurrency(unitPrice)
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium tabular-nums">
                          {formatCurrency(value)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm tabular-nums">
                          {profitability != null ? (
                            <span className={profitability >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                              {profitability >= 0 ? "+" : ""}
                              {(profitability * 100).toFixed(2)}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default Investments;
