import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Trash2,
  User,
  Calendar,
  Loader2,
  FilePlus,
  Clock,
  CheckCircle2,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { consultantApi, getApiBaseUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import ChartCard from "@/components/dashboard/ChartCard";
import { useAuth } from "@/hooks/useAuth";

// --- Types ---

const REPORTS_PAGE_SIZE = 6;

interface Report {
  id: string;
  clientName: string;
  type: string;
  generatedAt: string;
  status: string;
  hasWatermark: boolean;
  downloadUrl?: string | null;
}

interface ReportKpiDef {
  title: string;
  value: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableReportKpiCard({ id, kpi }: { id: string; kpi: ReportKpiDef }) {
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
        </div>
      </div>
    </div>
  );
}

// --- Constants ---

const REPORT_KPI_IDS = ["rpt-total", "rpt-completed", "rpt-pending", "rpt-recent"] as const;

// --- Component ---

const ProfessionalReports = () => {
  const { t, i18n } = useTranslation(['consultant', 'common']);
  const { user } = useAuth();
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;

  const [selectedClient, setSelectedClient] = useState("all");
  const [reportType, setReportType] = useState("");
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [customBranding, setCustomBranding] = useState(false);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [reportsPage, setReportsPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reportTypes = [
    "portfolio_analysis",
    "financial_planning",
    "monthly",
  ];

  // Helper functions for dynamic labels
  const getReportTypeLabel = (type: string) => {
    return t(`consultant:reports.types.${type}`, { defaultValue: type });
  };

  const getReportTypeDescription = (type: string) => {
    return t(`consultant:reports.typeDescriptions.${type}`, { defaultValue: "" });
  };

  // --- KPI DnD ---

  const kpiStorageKey = `reports-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === REPORT_KPI_IDS.length &&
          REPORT_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...REPORT_KPI_IDS];
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

  // Fetch reports and clients in parallel with caching
  const { data: reportsData, isLoading: reportsLoading, error: reportsError } = useQuery({
    queryKey: ['consultant', 'reports'],
    queryFn: () => consultantApi.getReports(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60000,
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['consultant', 'clients', 'active'],
    queryFn: () => consultantApi.getClients({ status: 'active', limit: 100 }),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const reports = reportsData?.reports || [];
  const clients = clientsData?.clients?.map((c: any) => ({ id: c.id, name: c.name })) || [];
  const loading = reportsLoading || clientsLoading;

  // --- KPI Computation ---

  const kpiData = useMemo(() => {
    const totalReports = reports.length;
    const completedReports = reports.filter((r: Report) => r.status === "completed" || r.status === "generated").length;
    const pendingReports = reports.filter((r: Report) => r.status === "pending" || r.status === "processing").length;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentReports = reports.filter((r: Report) => {
      try { return new Date(r.generatedAt) >= sevenDaysAgo; } catch { return false; }
    }).length;

    return {
      "rpt-total": {
        title: t('consultant:reports.kpis.totalReports'),
        value: String(totalReports),
        changeType: "neutral" as const,
        icon: FileText,
        watermark: FileText,
      },
      "rpt-completed": {
        title: t('consultant:reports.kpis.completed'),
        value: String(completedReports),
        changeType: "positive" as const,
        icon: CheckCircle2,
        watermark: CheckCircle2,
      },
      "rpt-pending": {
        title: t('consultant:reports.kpis.pending'),
        value: String(pendingReports),
        changeType: pendingReports > 0 ? "negative" as const : "neutral" as const,
        icon: Clock,
        watermark: Clock,
      },
      "rpt-recent": {
        title: t('consultant:reports.kpis.recentReports'),
        value: String(recentReports),
        changeType: "neutral" as const,
        icon: Calendar,
        watermark: Calendar,
      },
    };
  }, [reports, t]);

  const generateMutation = useMutation({
    mutationFn: (params: {
      clientId?: string;
      type: string;
      includeWatermark: boolean;
      customBranding: boolean;
    }) => consultantApi.generateReport(params),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'reports'] });
      toast({
        title: t('common:success'),
        description: result.message || t('consultant:reports.toast.generateSuccess'),
        variant: "success",
      });
      setSelectedClient("all");
      setReportType("");
      setIncludeWatermark(true);
      setCustomBranding(false);
    },
    onError: (err: any) => {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:reports.toast.generateError'),
        variant: "destructive",
      });
    },
  });

  const reportDownloadUrl = (reportId: string) => `${getApiBaseUrl()}/consultant/reports/${reportId}/file`;

  const handleDownload = async (reportId: string) => {
    const url = reportDownloadUrl(reportId);
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    try {
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
      if (!res.ok) throw new Error(t('consultant:reports.toast.downloadFailed'));
      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? t('consultant:reports.downloadFilename', { id: reportId });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: t('common:error'), description: t('consultant:reports.toast.downloadError'), variant: "destructive" });
    }
  };

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => consultantApi.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'reports'] });
      setDeleteReportId(null);
      toast({ title: t('consultant:reports.toast.deleteSuccess'), description: t('consultant:reports.toast.deleteSuccessDesc'), variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: t('common:error'), description: err?.error || t('consultant:reports.toast.deleteError'), variant: "destructive" });
    },
  });

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast({
        title: t('common:error'),
        description: t('consultant:reports.toast.typeRequired'),
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      clientId: selectedClient === "all" ? undefined : selectedClient,
      type: reportType,
      includeWatermark,
      customBranding,
    });
  };

  const formatReportDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
      } else if (diffInHours < 48) {
        return `${t('consultant:reports.yesterday')} ${format(date, 'HH:mm', { locale: dateLocale })}`;
      } else {
        return format(date, t('consultant:reports.dateTimeFormat'), { locale: dateLocale });
      }
    } catch {
      return dateString;
    }
  };

  // Reset reports page when client filter changes
  useEffect(() => {
    setReportsPage(1);
  }, [selectedClient]);

  // Filter reports by selected client
  const filteredReports = selectedClient === "all"
    ? reports
    : reports.filter((r) => {
        const client = clients.find((c: any) => c.id === selectedClient);
        return client && r.clientName === client.name;
      });

  const reportsTotal = filteredReports.length;
  const reportsTotalPages = Math.max(1, Math.ceil(reportsTotal / REPORTS_PAGE_SIZE));
  const safePage = Math.min(reportsPage, reportsTotalPages);
  const reportsStart = (safePage - 1) * REPORTS_PAGE_SIZE;
  const paginatedReports = filteredReports.slice(reportsStart, reportsStart + REPORTS_PAGE_SIZE);
  const reportsEnd = reportsTotal > 0 ? Math.min(reportsStart + REPORTS_PAGE_SIZE, reportsTotal) : 0;

  return (
    <div className="space-y-6 pb-6 md:pb-0 min-w-0">
      {/* KPI Cards */}
      <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiOrder.map((id) => (
              <SortableReportKpiCard key={id} id={id} kpi={kpiData[id as keyof typeof kpiData]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Report Generator + Reports History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* Report Generator */}
        <ChartCard
          title={t('consultant:reports.generator.title')}
          subtitle={t('consultant:reports.generator.subtitle')}
        >
          <div className="space-y-5 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="client" className="text-sm font-medium">{t('consultant:reports.generator.client')}</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger id="client" className="h-11 min-h-11 touch-manipulation">
                    <SelectValue placeholder={t('consultant:reports.generator.clientPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('consultant:reports.generator.general')}</SelectItem>
                    {clientsLoading ? (
                      <SelectItem value="loading" disabled>{t('consultant:reports.generator.loadingClients')}</SelectItem>
                    ) : clients.length === 0 ? (
                      <SelectItem value="none" disabled>{t('consultant:reports.generator.noActiveClients')}</SelectItem>
                    ) : (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-medium">{t('consultant:reports.generator.reportType')}</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger id="type" className="h-11 min-h-11 touch-manipulation">
                    <SelectValue placeholder={t('consultant:reports.generator.reportTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getReportTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {reportType && getReportTypeDescription(reportType) && (
                  <p className="text-xs text-muted-foreground mt-1.5 pl-0.5">
                    {getReportTypeDescription(reportType)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 py-1 -my-1 rounded-md touch-manipulation">
                <Checkbox
                  id="watermark"
                  checked={includeWatermark}
                  onCheckedChange={(checked) => setIncludeWatermark(checked as boolean)}
                  className="h-5 w-5 rounded border-2 data-[state=checked]:bg-primary"
                />
                <Label htmlFor="watermark" className="cursor-pointer text-sm flex-1 py-2">
                  {t('consultant:reports.generator.includeWatermark')}
                </Label>
              </div>

              <div className="flex items-center gap-3 py-1 -my-1 rounded-md touch-manipulation">
                <Checkbox
                  id="branding"
                  checked={customBranding}
                  onCheckedChange={(checked) => setCustomBranding(checked as boolean)}
                  className="h-5 w-5 rounded border-2 data-[state=checked]:bg-primary"
                />
                <Label htmlFor="branding" className="cursor-pointer text-sm flex-1 py-2">
                  {t('consultant:reports.generator.customBranding')}
                </Label>
              </div>
            </div>

            <Button
              className="w-full md:w-auto min-h-11 touch-manipulation text-base font-medium"
              disabled={!reportType || generateMutation.isPending || clients.length === 0}
              onClick={handleGenerateReport}
            >
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" /> : <FileText className="h-4 w-4 mr-2 shrink-0" />}
              {generateMutation.isPending ? t('consultant:reports.generator.generating') : t('consultant:reports.generator.generateButton')}
            </Button>
            {clients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t('consultant:reports.generator.needActiveClients')}
              </p>
            )}
          </div>
        </ChartCard>

        {/* Reports History */}
        <ChartCard
          title={t('consultant:reports.history.title')}
          subtitle={
            reportsTotal > 0
              ? reportsTotalPages > 1
                ? t('consultant:reports.history.showing', { start: reportsStart + 1, end: reportsEnd, total: reportsTotal })
                : t('consultant:reports.history.total', { total: reportsTotal })
              : t('consultant:reports.history.historyLabel')
          }
        >
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 w-full rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : reportsError ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-destructive/70" />
                <p className="text-sm font-medium text-foreground">{t('consultant:reports.history.loadError')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(reportsError as any)?.error || t('consultant:reports.history.tryAgain')}
                </p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {selectedClient !== "all" ? t('consultant:reports.history.noReportsClient') : t('consultant:reports.history.noReports')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedClient !== "all" ? t('consultant:reports.history.noReportsClientDesc') : t('consultant:reports.history.noReportsDesc')}
                </p>
              </div>
            ) : (
              <>
              {paginatedReports.map((report: Report) => (
                <div
                  key={report.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border transition-colors",
                    "border-border bg-muted/20 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base">
                          {getReportTypeLabel(report.type)}
                        </h3>
                        <Badge className="text-xs shrink-0 hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-600/90 text-white border-0">
                          {t('consultant:reports.history.statusGenerated')}
                        </Badge>
                        {report.hasWatermark && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            <User className="h-3 w-3 mr-1" />
                            {t('consultant:reports.history.watermark')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          {report.clientName}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          {formatReportDate(report.generatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2 shrink-0 border-t border-border pt-3 sm:pt-0 sm:border-t-0 flex-wrap">
                    <Badge className="text-xs shrink-0 sm:hidden bg-emerald-600 hover:bg-emerald-600/90 text-white border-0">
                      {t('consultant:reports.history.statusGenerated')}
                    </Badge>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground sm:hidden shrink-0">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {formatReportDate(report.generatedAt)}
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(report.id)}
                        className="min-h-10 min-w-10 touch-manipulation p-2"
                        aria-label={t('consultant:reports.history.download')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive min-h-10 min-w-10 touch-manipulation p-2"
                        onClick={() => setDeleteReportId(report.id)}
                        aria-label={t('consultant:reports.history.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {reportsTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground order-2 sm:order-1">
                    {t('consultant:reports.history.page', { current: safePage, total: reportsTotalPages })}
                  </p>
                  <Pagination className="order-1 sm:order-2">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
                          className={cn(safePage === 1 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setReportsPage((p) => Math.min(reportsTotalPages, p + 1))}
                          className={cn(safePage === reportsTotalPages && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
              </>
            )}
          </div>
        </ChartCard>
      </div>

      <AlertDialog open={!!deleteReportId} onOpenChange={(open) => !open && setDeleteReportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('consultant:reports.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('consultant:reports.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReportMutation.isPending}>{t('consultant:reports.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReportId && deleteReportMutation.mutate(deleteReportId)}
              disabled={deleteReportMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReportMutation.isPending ? t('consultant:reports.deleteDialog.deleting') : t('consultant:reports.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfessionalReports;
