import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  PieChart,
  TrendingUp,
  TrendingDown,
  History,
  Calendar,
  Clock,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

// --- KPI Card types & component ---

interface RepKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableRepKpiCard({ id, kpi }: { id: string; kpi: RepKpiDef }) {
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

const REPORTS_KPI_IDS = [
  "rep-total",
  "rep-month",
  "rep-types",
  "rep-latest",
] as const;


const Reports = () => {
  const { t, i18n } = useTranslation(["reports", "common"]);
  const { user } = useAuth();
  const { toast } = useToast();

  const reportTypes = [
    { id: "customer-portfolio", value: "portfolio_analysis", label: t("reportTypes.portfolio") },
    { id: "investment-report", value: "portfolio_analysis", label: t("reportTypes.investment") },
    { id: "transaction-report", value: "transactions", label: t("reportTypes.transaction") },
  ];

  const [selectedId, setSelectedId] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const reportType = reportTypes.find((rt) => rt.id === selectedId)?.value ?? "";

  // --- Report history for KPIs ---
  const [reports, setReports] = useState<
    Array<{
      id: string;
      type: string;
      generatedAt: string;
      status: string;
      downloadUrl: string | null;
    }>
  >([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchReportHistory = useCallback(async () => {
    try {
      setLoadingReports(true);
      const data = await reportsApi.getAll().catch(() => ({ reports: [] }));
      setReports(data.reports || []);
    } catch {
      console.error("Error fetching report history");
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchReportHistory();
  }, [fetchReportHistory]);

  // --- KPI drag order ---
  const kpiStorageKey = `reports-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === REPORTS_KPI_IDS.length &&
          REPORTS_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...REPORTS_KPI_IDS];
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

  // --- Generate handler ---

  const handleGenerate = async () => {
    if (!reportType) {
      toast({
        title: t("common:error"),
        description: t("generateForm.selectReportType"),
        variant: "warning",
      });
      return;
    }

    try {
      setGenerating(true);
      const selectedLabel = reportTypes.find((rt) => rt.id === selectedId)?.label ?? "";
      const result = await reportsApi.generate({
        type: reportType,
        dateRange: dateRange || undefined,
        params: { reportLabel: selectedLabel },
      });
      toast({
        title: t("common:success"),
        description: (
          <>
            {t("generateForm.reportGenerated")}{" "}
            <a href="/app/reports/history" className="underline font-medium">
              {t("generateForm.viewInHistory")}
            </a>
          </>
        ),
        variant: "success",
      });
      setSelectedId("");
      setDateRange("");
      fetchReportHistory();
    } catch (err: any) {
      if (err?.error === 'limit_reached' || err?.error === 'upgrade_required') {
        const plan = err.upgradePlan || err.requiredPlan || 'premium';
        toast({
          title: err.error === 'limit_reached'
            ? t("common:planLimit.limitReached")
            : t("common:planLimit.upgradeRequired"),
          description: err.error === 'limit_reached'
            ? t("common:planLimit.limitReachedDesc", { limit: err.limit, plan })
            : t("common:planLimit.upgradeRequiredDesc", { plan }),
          variant: "warning",
        });
      } else {
        toast({
          title: t("common:error"),
          description: t("common:generateError"),
          variant: "destructive",
        });
      }
      console.error("Error generating report:", err);
    } finally {
      setGenerating(false);
    }
  };

  // --- KPI computed values ---

  const totalReports = reports.length;

  const now = new Date();
  const thisMonthReports = reports.filter((r) => {
    const d = new Date(r.generatedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const distinctTypes = new Set(reports.map((r) => r.type)).size;

  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
  const lastReport = sortedReports[0] || null;

  const localeMap: Record<string, string> = { "pt-BR": "pt-BR", en: "en-US", pt: "pt-BR" };
  const intlLocale = localeMap[i18n.language] || i18n.language;
  const lastGeneratedDate = lastReport
    ? new Date(lastReport.generatedAt).toLocaleDateString(intlLocale, {
        day: "2-digit",
        month: "short",
      })
    : "---";

  const reportTypeLabels: Record<string, string> = {
    consolidated: t("history.typeLabels.consolidated"),
    transactions: t("history.typeLabels.transactions"),
    portfolio_analysis: t("history.typeLabels.portfolio_analysis"),
    monthly: t("history.typeLabels.monthly"),
  };
  const lastReportTypeLabel = lastReport
    ? reportTypeLabels[lastReport.type] || lastReport.type
    : undefined;

  const kpiData: Record<string, RepKpiDef> = {
    "rep-total": {
      title: t("kpi.totalReports"),
      value: String(totalReports),
      change: totalReports > 0
        ? t("kpi.generated", { count: totalReports })
        : undefined,
      changeType: totalReports > 0 ? "positive" : "neutral",
      icon: FileText,
      watermark: FileText,
    },
    "rep-month": {
      title: t("kpi.thisMonth"),
      value: String(thisMonthReports),
      change: thisMonthReports > 0
        ? t("kpi.thisMonthLabel")
        : undefined,
      changeType: thisMonthReports > 0 ? "positive" : "neutral",
      icon: Calendar,
      watermark: Calendar,
    },
    "rep-types": {
      title: t("kpi.reportTypes"),
      value: String(distinctTypes),
      change: distinctTypes > 0
        ? t("kpi.categories", { count: distinctTypes })
        : undefined,
      changeType: distinctTypes > 0 ? "positive" : "neutral",
      icon: PieChart,
      watermark: PieChart,
    },
    "rep-latest": {
      title: t("kpi.lastGenerated"),
      value: lastGeneratedDate,
      change: lastReportTypeLabel,
      changeType: lastReport ? "positive" : "neutral",
      icon: Clock,
      watermark: Clock,
    },
  };

  // --- KPI grid JSX (reused in loading state) ---
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
            return <SortableRepKpiCard key={id} id={id} kpi={kpi} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

  // Show loading only initially
  if (loadingReports) {
    return (
      <div className="space-y-6 min-w-0">
        {kpiGrid}
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      {kpiGrid}

      {/* Generate form */}
      <ChartCard
        title={t("generateForm.title")}
        subtitle={t("generateForm.subtitle")}
        actions={
          <Link to="/app/reports/history">
            <Button variant="outline" size="sm" className="shrink-0">
              <History className="h-4 w-4 mr-2" />
              {t("viewHistory")}
            </Button>
          </Link>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("generateForm.reportType")}</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("generateForm.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("generateForm.period")}</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("generateForm.selectPeriod")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">{t("generateForm.currentMonth")}</SelectItem>
                  <SelectItem value="last-month">{t("generateForm.lastMonth")}</SelectItem>
                  <SelectItem value="last-3-months">{t("generateForm.last3Months")}</SelectItem>
                  <SelectItem value="last-6-months">{t("generateForm.last6Months")}</SelectItem>
                  <SelectItem value="last-year">{t("generateForm.lastYear")}</SelectItem>
                  <SelectItem value="custom">{t("generateForm.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!reportType || generating}
            className="w-full sm:w-auto min-w-[200px]"
          >
            <FileText className={cn("h-4 w-4 mr-2", generating && "animate-pulse")} />
            {generating ? t("generateForm.generating") : t("generateForm.generate")}
          </Button>
        </div>
      </ChartCard>
    </div>
  );
};

export default Reports;
