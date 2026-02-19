import { useState, useEffect, useMemo, useCallback } from "react";
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
import jsPDF, { GState } from "jspdf";
import autoTable from "jspdf-autotable";
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
import { consultantApi } from "@/lib/api";
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
import { useCurrency } from "@/contexts/CurrencyContext";

// --- Types ---

const REPORTS_PAGE_SIZE = 6;

interface Report {
  id: string;
  clientId: string | null;
  clientName: string;
  type: string;
  generatedAt: string;
  status: string;
  hasWatermark: boolean;
  customBranding: boolean;
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
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [reportsPage, setReportsPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

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
        description: t('consultant:reports.toast.generateSuccess'),
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
        description: t('consultant:reports.toast.generateError'),
        variant: "destructive",
      });
    },
  });

  const handleDownload = useCallback(async (reportId: string) => {
    const report = reports.find((r: Report) => r.id === reportId);
    if (!report) return;

    setDownloadingReportId(reportId);

    try {
      // Use clientId directly from the report record
      let finance: any = null;
      const clientId = report.clientId || clients.find((c: any) => c.name === report.clientName)?.id;

      if (clientId) {
        try {
          finance = await consultantApi.getClientFinance(clientId);
        } catch {
          // Continue without finance data
        }
      }

      // --- PDF Generation ---
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentW = pageW - margin * 2;
      let y = 0;

      // --- Color Palette ---
      const colors = {
        primary: [37, 99, 235] as [number, number, number],       // blue-600
        primaryLight: [219, 234, 254] as [number, number, number], // blue-100
        success: [16, 185, 129] as [number, number, number],      // emerald-500
        successLight: [209, 250, 229] as [number, number, number], // emerald-100
        warning: [245, 158, 11] as [number, number, number],      // amber-500
        warningLight: [254, 243, 199] as [number, number, number], // amber-100
        danger: [239, 68, 68] as [number, number, number],        // red-500
        dangerLight: [254, 226, 226] as [number, number, number], // red-100
        purple: [139, 92, 246] as [number, number, number],       // violet-500
        purpleLight: [237, 233, 254] as [number, number, number], // violet-100
        dark: [15, 23, 42] as [number, number, number],           // slate-900
        text: [30, 41, 59] as [number, number, number],           // slate-800
        muted: [100, 116, 139] as [number, number, number],       // slate-500
        light: [241, 245, 249] as [number, number, number],       // slate-100
        white: [255, 255, 255] as [number, number, number],
        border: [226, 232, 240] as [number, number, number],      // slate-200
      };

      const reportTypeLabel = getReportTypeLabel(report.type);
      const generatedDate = (() => {
        try { return format(new Date(report.generatedAt), t('consultant:reports.dateTimeFormat'), { locale: dateLocale }); }
        catch { return report.generatedAt; }
      })();

      // ════════════════════════════════════════════════════
      // HEADER — Full-width dark banner with gradient feel
      // ════════════════════════════════════════════════════
      const headerH = 44;
      doc.setFillColor(...colors.dark);
      doc.rect(0, 0, pageW, headerH, "F");
      // Accent bar
      doc.setFillColor(...colors.primary);
      doc.rect(0, headerH - 2, pageW, 2, "F");

      doc.setTextColor(...colors.white);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(reportTypeLabel, margin, 17);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 200, 230);
      doc.text(`${t('consultant:reports.pdf.client', { defaultValue: 'Client' })}: ${report.clientName}`, margin, 27);
      doc.text(`${t('consultant:reports.pdf.generated', { defaultValue: 'Generated' })}: ${generatedDate}`, margin, 33);
      doc.text(`${t('consultant:reports.pdf.reportId', { defaultValue: 'Report ID' })}: ${report.id.slice(0, 8).toUpperCase()}`, margin, 39);

      // Logo / brand text right
      const consultantName = user?.full_name || 'Consultant';
      if (report.customBranding) {
        // Custom branding: show consultant's name instead of zurT
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.white);
        const brandName = consultantName;
        doc.text(brandName, pageW - margin, 18, { align: "right" });
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160, 180, 210);
        doc.text(t('consultant:reports.pdf.financialConsultant', { defaultValue: 'Financial Consultant' }), pageW - margin, 25, { align: "right" });
        // Accent line under brand name
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.3);
        const brandTextW = doc.getTextWidth(brandName);
        doc.line(pageW - margin - brandTextW, 20, pageW - margin, 20);
      } else {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.white);
        doc.text("zurT", pageW - margin, 20, { align: "right" });
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160, 180, 210);
        doc.text(t('consultant:reports.pdf.professionalReport', { defaultValue: 'Professional Report' }), pageW - margin, 27, { align: "right" });
      }

      y = headerH + 10;

      // ════════════════════════════════════════════════════
      // FINANCIAL SUMMARY CARDS
      // ════════════════════════════════════════════════════
      if (finance?.summary) {
        const s = finance.summary;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.dark);
        doc.text(t('consultant:reports.pdf.financialSummary', { defaultValue: 'Financial Summary' }), margin, y);
        y += 7;

        const cardW = (contentW - 9) / 4;
        const cardH = 24;

        const summaryCards = [
          { label: t('consultant:reports.pdf.netWorth', { defaultValue: 'Net Worth' }), value: formatCurrency(s.netWorth), color: colors.primary, bg: colors.primaryLight },
          { label: t('consultant:reports.pdf.cash', { defaultValue: 'Cash' }), value: formatCurrency(s.cash), color: colors.success, bg: colors.successLight },
          { label: t('consultant:reports.pdf.investments', { defaultValue: 'Investments' }), value: formatCurrency(s.investments), color: colors.purple, bg: colors.purpleLight },
          { label: t('consultant:reports.pdf.debt', { defaultValue: 'Debt' }), value: formatCurrency(s.debt), color: colors.danger, bg: colors.dangerLight },
        ];

        summaryCards.forEach((card, i) => {
          const cx = margin + i * (cardW + 3);
          doc.setFillColor(...card.bg);
          doc.setDrawColor(...card.color);
          doc.setLineWidth(0.5);
          doc.roundedRect(cx, y, cardW, cardH, 2, 2, "FD");
          // Left accent bar
          doc.setFillColor(...card.color);
          doc.rect(cx, y + 2, 2, cardH - 4, "F");

          doc.setFontSize(7);
          doc.setTextColor(...colors.muted);
          doc.setFont("helvetica", "normal");
          doc.text(card.label, cx + 6, y + 8);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...card.color);
          doc.text(card.value, cx + 6, y + 17);
        });

        y += cardH + 10;
      }

      // ════════════════════════════════════════════════════
      // ACCOUNTS TABLE
      // ════════════════════════════════════════════════════
      if (finance?.accounts?.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.dark);
        doc.text(t('consultant:reports.pdf.bankAccounts', { defaultValue: 'Bank Accounts' }), margin, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [[
            t('consultant:reports.pdf.accountName', { defaultValue: 'Account' }),
            t('consultant:reports.pdf.type', { defaultValue: 'Type' }),
            t('consultant:reports.pdf.institution', { defaultValue: 'Institution' }),
            t('consultant:reports.pdf.balance', { defaultValue: 'Balance' }),
          ]],
          body: finance.accounts.map((a: any) => [
            a.name || "—",
            a.type || "—",
            a.institution_name || "—",
            formatCurrency(Number(a.current_balance) || 0),
          ]),
          theme: "grid",
          headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: "bold", fontSize: 8, cellPadding: 3.5 },
          bodyStyles: { textColor: colors.text, fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 3: { halign: "right", fontStyle: "bold" } },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // ════════════════════════════════════════════════════
      // INVESTMENTS TABLE
      // ════════════════════════════════════════════════════
      if (finance?.investments?.length > 0 && (report.type === "portfolio_analysis" || report.type === "financial_planning" || report.type === "consolidated")) {
        if (y > pageH - 50) { doc.addPage(); y = margin; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.dark);
        doc.text(t('consultant:reports.pdf.investmentPortfolio', { defaultValue: 'Investment Portfolio' }), margin, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [[
            t('consultant:reports.pdf.investmentName', { defaultValue: 'Name' }),
            t('consultant:reports.pdf.type', { defaultValue: 'Type' }),
            t('consultant:reports.pdf.institution', { defaultValue: 'Institution' }),
            t('consultant:reports.pdf.quantity', { defaultValue: 'Qty' }),
            t('consultant:reports.pdf.currentValue', { defaultValue: 'Value' }),
          ]],
          body: finance.investments.map((inv: any) => [
            inv.name || "—",
            inv.type || "—",
            inv.institution_name || "—",
            inv.quantity?.toString() || "—",
            formatCurrency(Number(inv.current_value) || 0),
          ]),
          theme: "grid",
          headStyles: { fillColor: colors.purple, textColor: colors.white, fontStyle: "bold", fontSize: 8, cellPadding: 3.5 },
          bodyStyles: { textColor: colors.text, fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [248, 245, 255] },
          columnStyles: { 3: { halign: "center" }, 4: { halign: "right", fontStyle: "bold" } },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // Investment Breakdown by type
        if (finance.breakdown?.length > 0) {
          if (y > pageH - 40) { doc.addPage(); y = margin; }

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...colors.dark);
          doc.text(t('consultant:reports.pdf.investmentBreakdown', { defaultValue: 'Investment Breakdown' }), margin, y);
          y += 5;

          const breakdownColors: [number, number, number][] = [
            colors.primary, colors.success, colors.purple, colors.warning, colors.danger,
            [6, 182, 212], [236, 72, 153], [34, 197, 94], [249, 115, 22], [99, 102, 241],
          ];
          const totalInv = finance.breakdown.reduce((sum: number, b: any) => sum + (b.total || 0), 0);

          autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [[
              t('consultant:reports.pdf.assetType', { defaultValue: 'Asset Type' }),
              t('consultant:reports.pdf.count', { defaultValue: 'Count' }),
              t('consultant:reports.pdf.totalValue', { defaultValue: 'Total Value' }),
              t('consultant:reports.pdf.share', { defaultValue: '% Share' }),
            ]],
            body: finance.breakdown.map((b: any, i: number) => [
              b.type || "—",
              String(b.count || 0),
              formatCurrency(b.total || 0),
              totalInv > 0 ? `${((b.total / totalInv) * 100).toFixed(1)}%` : "—",
            ]),
            theme: "grid",
            headStyles: { fillColor: colors.success, textColor: colors.white, fontStyle: "bold", fontSize: 8, cellPadding: 3.5 },
            bodyStyles: { textColor: colors.text, fontSize: 8, cellPadding: 3 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            columnStyles: { 1: { halign: "center" }, 2: { halign: "right", fontStyle: "bold" }, 3: { halign: "center" } },
            didDrawCell: (data: any) => {
              // Color dot indicator on type column
              if (data.section === "body" && data.column.index === 0) {
                const dotColor = breakdownColors[data.row.index % breakdownColors.length];
                doc.setFillColor(...dotColor);
                doc.circle(data.cell.x + 3, data.cell.y + data.cell.height / 2, 1.5, "F");
              }
            },
          });
          y = (doc as any).lastAutoTable.finalY + 8;
        }
      }

      // ════════════════════════════════════════════════════
      // CREDIT CARDS
      // ════════════════════════════════════════════════════
      if (finance?.cards?.length > 0) {
        if (y > pageH - 50) { doc.addPage(); y = margin; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.dark);
        doc.text(t('consultant:reports.pdf.creditCards', { defaultValue: 'Credit Cards' }), margin, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [[
            t('consultant:reports.pdf.card', { defaultValue: 'Card' }),
            t('consultant:reports.pdf.institution', { defaultValue: 'Institution' }),
            t('consultant:reports.pdf.openDebt', { defaultValue: 'Open Debt' }),
          ]],
          body: finance.cards.map((c: any) => [
            `${c.brand || ""} •••• ${c.last4 || "****"}`.trim(),
            c.institution_name || "—",
            formatCurrency(Number(c.openDebt) || 0),
          ]),
          theme: "grid",
          headStyles: { fillColor: colors.warning, textColor: colors.white, fontStyle: "bold", fontSize: 8, cellPadding: 3.5 },
          bodyStyles: { textColor: colors.text, fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [255, 251, 235] },
          columnStyles: { 2: { halign: "right", fontStyle: "bold", textColor: colors.danger } },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // ════════════════════════════════════════════════════
      // TRANSACTIONS TABLE
      // ════════════════════════════════════════════════════
      if (finance?.transactions?.length > 0) {
        if (y > pageH - 50) { doc.addPage(); y = margin; }

        // Monthly summary for "monthly" report type
        if (report.type === "monthly") {
          const income = finance.transactions.filter((tx: any) => tx.amount > 0).reduce((s: number, tx: any) => s + tx.amount, 0);
          const expenses = finance.transactions.filter((tx: any) => tx.amount < 0).reduce((s: number, tx: any) => s + Math.abs(tx.amount), 0);
          const balance = income - expenses;

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...colors.dark);
          doc.text(t('consultant:reports.pdf.periodSummary', { defaultValue: 'Period Summary' }), margin, y);
          y += 7;

          const sumCardW = (contentW - 6) / 3;
          const sumCardH = 22;

          const sumCards = [
            { label: t('consultant:reports.pdf.income', { defaultValue: 'Income' }), value: formatCurrency(income), color: colors.success, bg: colors.successLight },
            { label: t('consultant:reports.pdf.expenses', { defaultValue: 'Expenses' }), value: formatCurrency(expenses), color: colors.danger, bg: colors.dangerLight },
            { label: t('consultant:reports.pdf.balance', { defaultValue: 'Balance' }), value: formatCurrency(balance), color: balance >= 0 ? colors.primary : colors.danger, bg: balance >= 0 ? colors.primaryLight : colors.dangerLight },
          ];

          sumCards.forEach((card, i) => {
            const cx = margin + i * (sumCardW + 3);
            doc.setFillColor(...card.bg);
            doc.setDrawColor(...card.color);
            doc.setLineWidth(0.4);
            doc.roundedRect(cx, y, sumCardW, sumCardH, 2, 2, "FD");
            doc.setFillColor(...card.color);
            doc.rect(cx, y + 2, 2, sumCardH - 4, "F");
            doc.setFontSize(7);
            doc.setTextColor(...colors.muted);
            doc.setFont("helvetica", "normal");
            doc.text(card.label, cx + 6, y + 8);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...card.color);
            doc.text(card.value, cx + 6, y + 17);
          });

          y += sumCardH + 10;
        }

        if (y > pageH - 50) { doc.addPage(); y = margin; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.dark);
        doc.text(t('consultant:reports.pdf.recentTransactions', { defaultValue: 'Recent Transactions' }), margin, y);
        y += 5;

        const txRows = finance.transactions.slice(0, 50).map((tx: any) => {
          const amt = Number(tx.amount) || 0;
          const dateStr = (() => {
            try { return format(new Date(tx.date), "dd/MM/yyyy"); }
            catch { return tx.date || "—"; }
          })();
          return [
            dateStr,
            tx.description || tx.merchant || "—",
            tx.account_name || tx.institution_name || "—",
            formatCurrency(amt),
          ];
        });

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [[
            t('consultant:reports.pdf.date', { defaultValue: 'Date' }),
            t('consultant:reports.pdf.description', { defaultValue: 'Description' }),
            t('consultant:reports.pdf.account', { defaultValue: 'Account' }),
            t('consultant:reports.pdf.amount', { defaultValue: 'Amount' }),
          ]],
          body: txRows,
          theme: "striped",
          headStyles: { fillColor: colors.dark, textColor: colors.white, fontStyle: "bold", fontSize: 8, cellPadding: 3 },
          bodyStyles: { textColor: colors.text, fontSize: 7.5, cellPadding: 2.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 22 },
            3: { halign: "right", fontStyle: "bold" },
          },
          didParseCell: (data: any) => {
            // Color amounts: green for positive, red for negative
            if (data.section === "body" && data.column.index === 3) {
              const rawVal = finance.transactions[data.row.index]?.amount;
              if (rawVal != null && Number(rawVal) < 0) {
                data.cell.styles.textColor = colors.danger;
              } else if (rawVal != null && Number(rawVal) > 0) {
                data.cell.styles.textColor = colors.success;
              }
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // ════════════════════════════════════════════════════
      // FINANCIAL PLANNING - Goals & Recommendations
      // ════════════════════════════════════════════════════
      if (report.type === "financial_planning") {
        if (y > pageH - 60) { doc.addPage(); y = margin; }

        // Section header with colored background
        doc.setFillColor(...colors.primaryLight);
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentW, 10, 2, 2, "FD");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.primary);
        doc.text(t('consultant:reports.pdf.planningNotes', { defaultValue: 'Financial Planning Notes' }), margin + 4, y + 7);
        y += 16;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colors.text);

        const planningNotes = [
          t('consultant:reports.pdf.planNote1', { defaultValue: 'Review portfolio allocation against client risk profile.' }),
          t('consultant:reports.pdf.planNote2', { defaultValue: 'Evaluate emergency fund adequacy (recommended: 6-12 months of expenses).' }),
          t('consultant:reports.pdf.planNote3', { defaultValue: 'Assess debt-to-income ratio and recommend reduction strategies if needed.' }),
          t('consultant:reports.pdf.planNote4', { defaultValue: 'Discuss investment horizon and adjust allocations for life stage.' }),
        ];

        planningNotes.forEach((note, i) => {
          // Colored bullet
          doc.setFillColor(...[colors.primary, colors.success, colors.warning, colors.purple][i % 4]);
          doc.circle(margin + 4, y + 0.5, 1.5, "F");
          const lines = doc.splitTextToSize(note, contentW - 14);
          doc.text(lines, margin + 10, y + 1.5);
          y += lines.length * 5 + 4;
        });

        y += 6;

        // Signature/notes area
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([2, 2], 0);
        doc.roundedRect(margin, y, contentW, 24, 2, 2, "S");
        doc.setLineDashPattern([], 0);
        doc.setFontSize(8);
        doc.setTextColor(...colors.muted);
        doc.text(t('consultant:reports.pdf.consultantNotes', { defaultValue: 'Consultant Notes / Recommendations:' }), margin + 4, y + 6);
        y += 30;
      }

      // ════════════════════════════════════════════════════
      // NO DATA FALLBACK
      // ════════════════════════════════════════════════════
      if (!finance) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colors.muted);
        const noDataMsg = t('consultant:reports.pdf.noFinancialData', {
          defaultValue: 'No financial data available for this client. Detailed sections require wallet sharing.',
        });
        const lines = doc.splitTextToSize(noDataMsg, contentW);
        doc.text(lines, margin, y + 4);
        y += lines.length * 6 + 10;
      }

      // ════════════════════════════════════════════════════
      // FOOTER + WATERMARK on every page
      // ════════════════════════════════════════════════════
      const pageCount = doc.getNumberOfPages();
      const watermarkName = user?.full_name || 'Consultant';

      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);

        // ── Watermark (diagonal, semi-transparent) ──
        if (report.hasWatermark) {
          doc.saveGraphicsState();
          doc.setGState(new GState({ opacity: 0.06 }));
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...colors.dark);
          doc.setFontSize(54);

          // Center of page, rotated -45°
          const cx = pageW / 2;
          const cy = pageH / 2;
          doc.text(watermarkName, cx, cy, {
            align: "center",
            angle: 45,
          });
          doc.restoreGraphicsState();
        }

        // ── Footer ──
        // Separator line
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 16, pageW - margin, pageH - 16);

        // Accent dot
        doc.setFillColor(...colors.primary);
        doc.circle(margin + 1, pageH - 11, 1, "F");

        doc.setFontSize(6.5);
        doc.setTextColor(...colors.muted);
        doc.setFont("helvetica", "normal");

        // Footer text — adjust for custom branding
        const footerText = report.customBranding
          ? t('consultant:reports.pdf.footerBranded', {
              defaultValue: `This report is confidential and intended for the named client only. Prepared by ${watermarkName}.`,
              name: watermarkName,
            })
          : t('consultant:reports.pdf.footer', {
              defaultValue: 'This report is confidential and intended for the named client only. zurT Financial Platform.',
            });
        doc.text(footerText, margin + 5, pageH - 10);
        doc.text(`${p} / ${pageCount}`, pageW - margin, pageH - 10, { align: "right" });

        // Report type tag at bottom right
        doc.setFontSize(6);
        doc.setTextColor(...colors.primary);
        doc.text(reportTypeLabel.toUpperCase(), pageW - margin, pageH - 6, { align: "right" });
      }

      // --- Save ---
      const sanitizedName = report.clientName.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `${report.type}-${sanitizedName}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      toast({
        title: t('consultant:reports.pdf.exportSuccess', { defaultValue: 'Report exported' }),
        description: t('consultant:reports.pdf.exportSuccessDesc', { defaultValue: 'PDF downloaded successfully.' }),
      });
    } catch (err) {
      console.error("PDF export error:", err);
      toast({
        title: t('common:error'),
        description: t('consultant:reports.toast.downloadError'),
        variant: "destructive",
      });
    } finally {
      setDownloadingReportId(null);
    }
  }, [reports, clients, formatCurrency, t, toast, dateLocale, getReportTypeLabel]);

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => consultantApi.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'reports'] });
      setDeleteReportId(null);
      toast({ title: t('consultant:reports.toast.deleteSuccess'), description: t('consultant:reports.toast.deleteSuccessDesc'), variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: t('common:error'), description: t('consultant:reports.toast.deleteError'), variant: "destructive" });
    },
  });

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast({
        title: t('common:error'),
        description: t('consultant:reports.toast.typeRequired'),
        variant: "warning",
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
                        {report.customBranding && (
                          <Badge variant="secondary" className="text-xs shrink-0 bg-violet-500/15 text-violet-400 border-violet-500/30">
                            {t('consultant:reports.history.branded', { defaultValue: 'Branded' })}
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
                        disabled={downloadingReportId === report.id}
                        className="min-h-10 min-w-10 touch-manipulation p-2"
                        aria-label={t('consultant:reports.history.download')}
                      >
                        {downloadingReportId === report.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Download className="h-4 w-4" />
                        }
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
