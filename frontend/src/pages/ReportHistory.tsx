import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FilePlus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  GripVertical,
  PieChart,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import ChartCard from "@/components/dashboard/ChartCard";
import { reportsApi, getApiBaseUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

// --- KPI Card types & component ---

interface RHKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableRHKpiCard({ id, kpi }: { id: string; kpi: RHKpiDef }) {
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

const REPORT_HISTORY_KPI_IDS = [
  "rh-total",
  "rh-month",
  "rh-types",
  "rh-latest",
] as const;

// --- Report types ---

interface Report {
  id: string;
  type: string;
  typeKey: string;
  date: string;
  status: "generated" | "pending";
  downloadUrl?: string | null;
}

function reportDownloadUrl(reportId: string): string {
  const base = getApiBaseUrl();
  return `${base}/reports/${reportId}/file`;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

const FILTER_ALL = "all";

const ReportHistory = () => {
  const { t, i18n } = useTranslation(["reports", "common"]);
  const { user } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [typeFilter, setTypeFilter] = useState<string>(FILTER_ALL);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reportTypeLabels: Record<string, string> = {
    consolidated: t("history.typeLabels.consolidated"),
    transactions: t("history.typeLabels.transactions"),
    portfolio_analysis: t("history.typeLabels.portfolio_analysis"),
    monthly: t("history.typeLabels.monthly"),
  };

  // --- KPI drag order ---
  const kpiStorageKey = `report-history-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === REPORT_HISTORY_KPI_IDS.length &&
          REPORT_HISTORY_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...REPORT_HISTORY_KPI_IDS];
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

  const filteredReports = useMemo(() => {
    let list = reports;
    if (typeFilter !== FILTER_ALL) {
      list = reports.filter((r) => r.typeKey === typeFilter);
    }
    return [...list].sort((a, b) => (b.date.localeCompare ? b.date.localeCompare(a.date) : 0));
  }, [reports, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, pageSize]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await reportsApi.getAll();
      setReports(
        data.reports.map((r) => ({
          id: r.id,
          type: (r.params?.reportLabel as string) || reportTypeLabels[r.type] || r.type,
          typeKey: r.type,
          date: r.generatedAt,
          status: r.status === "generated" ? "generated" : "pending",
          downloadUrl: r.downloadUrl || reportDownloadUrl(r.id),
        }))
      );
    } catch (err: any) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownload = async (reportId: string) => {
    const url = reportDownloadUrl(reportId);
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(t("history.downloadError"));
      const blob = await res.blob();
      const name =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `relatorio-${reportId}.pdf`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: t("history.downloadStarted"), description: t("history.downloadDesc"), variant: "success" });
    } catch (e) {
      toast({
        title: t("common:error"),
        description: t("history.downloadError"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteReport = async () => {
    if (!deleteReportId) return;
    try {
      setDeleting(true);
      await reportsApi.delete(deleteReportId);
      setReports((prev) => prev.filter((r) => r.id !== deleteReportId));
      setDeleteReportId(null);
      toast({ title: t("history.reportRemoved"), description: t("history.reportRemovedDesc"), variant: "success" });
    } catch (e: any) {
      toast({
        title: t("common:error"),
        description: e?.error ?? t("history.removeError"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // --- KPI computed values ---

  const totalReports = reports.length;

  const now = new Date();
  const thisMonthReports = reports.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const distinctTypes = new Set(reports.map((r) => r.typeKey)).size;

  const sortedByDate = [...reports].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastReport = sortedByDate[0] || null;

  const localeMap: Record<string, string> = { "pt-BR": "pt-BR", en: "en-US", pt: "pt-BR" };
  const intlLocale = localeMap[i18n.language] || i18n.language;
  const lastGeneratedDate = lastReport
    ? new Date(lastReport.date).toLocaleDateString(intlLocale, {
        day: "2-digit",
        month: "short",
      })
    : "---";

  const lastReportTypeLabel = lastReport
    ? reportTypeLabels[lastReport.typeKey] || lastReport.type
    : undefined;

  const kpiData: Record<string, RHKpiDef> = {
    "rh-total": {
      title: t("history.kpi.totalReports"),
      value: String(totalReports),
      change: totalReports > 0
        ? t("history.kpi.generated", { count: totalReports })
        : undefined,
      changeType: totalReports > 0 ? "positive" : "neutral",
      icon: FileText,
      watermark: FileText,
    },
    "rh-month": {
      title: t("history.kpi.thisMonth"),
      value: String(thisMonthReports),
      change: thisMonthReports > 0
        ? t("history.kpi.thisMonthLabel")
        : undefined,
      changeType: thisMonthReports > 0 ? "positive" : "neutral",
      icon: Calendar,
      watermark: Calendar,
    },
    "rh-types": {
      title: t("history.kpi.reportTypes"),
      value: String(distinctTypes),
      change: distinctTypes > 0
        ? t("history.kpi.categories", { count: distinctTypes })
        : undefined,
      changeType: distinctTypes > 0 ? "positive" : "neutral",
      icon: PieChart,
      watermark: PieChart,
    },
    "rh-latest": {
      title: t("history.kpi.lastGenerated"),
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
            return <SortableRHKpiCard key={id} id={id} kpi={kpi} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

  // Show loading only initially
  if (loading) {
    return (
      <div className="space-y-6 min-w-0">
        {kpiGrid}
        <ChartCard title={t("history.generatedReports")} className="min-w-0 overflow-hidden">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      {/* KPI Cards */}
      {kpiGrid}

      <ChartCard
        title={t("history.generatedReports")}
        subtitle={filteredReports.length > 0 ? t("history.reportCount", { count: filteredReports.length }) : undefined}
        className="min-w-0 overflow-hidden"
        actions={
          <div className="flex items-center gap-1.5">
            {reports.length > 0 && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder={t("history.filterByType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>{t("common:all")}</SelectItem>
                  {Object.entries(reportTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Link to="/app/reports">
              <Button variant="outline" size="sm" className="shrink-0">
                <FilePlus className="h-4 w-4 mr-2" />
                {t("generateNew")}
              </Button>
            </Link>
          </div>
        }
      >
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">{t("history.noReports")}</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              {t("history.noReportsDesc")}
            </p>
            <Link to="/app/reports">
              <Button className="gap-2">
                <FilePlus className="h-4 w-4" />
                {t("history.goToReports")}
              </Button>
            </Link>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{t("history.noFilterResults")}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setTypeFilter(FILTER_ALL)}>
              {t("common:clearFilter")}
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-border">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("history.tableHeaders.type")}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("history.tableHeaders.date")}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("history.tableHeaders.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground">
                            {report.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {t("history.generatedAt", { date: report.date })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(report.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("history.downloadPdf")}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteReportId(report.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("history.removeReport")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: card list */}
            <div className="md:hidden space-y-3 min-w-0">
              {paginatedReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border-2 border-primary/30 bg-card p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">
                        {report.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownload(report.id)}
                        aria-label={t("history.downloadPdf")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteReportId(report.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={t("history.removeReport")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("history.generatedAt", { date: report.date })}
                  </p>
                </div>
              ))}
            </div>

            {filteredReports.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {t("common:showing")} {startIndex + 1}–
                    {Math.min(startIndex + pageSize, filteredReports.length)} {t("common:of")}{" "}
                    {filteredReports.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <label htmlFor="reports-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
                      {t("history.perPage")}
                    </label>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => setPageSize(Number(v))}
                    >
                      <SelectTrigger id="reports-per-page" className="w-[4.5rem] h-9" aria-label={t("history.perPage")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label={t("common:previousPage")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      )
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    aria-label={t("common:nextPage")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </ChartCard>

      <AlertDialog open={!!deleteReportId} onOpenChange={(open) => !open && setDeleteReportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("history.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("history.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("history.deleting") : t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReportHistory;
