import { useState, useEffect, useMemo, useCallback } from "react";
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
  Loader2,
  type LucideIcon,
} from "lucide-react";
import jsPDF from "jspdf";
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
import { reportsApi, dashboardApi } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { formatCurrency } = useCurrency();
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;

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
          downloadUrl: r.downloadUrl || null,
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

  const handleDownload = useCallback(async (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;
    setDownloadingId(reportId);

    try {
      // Fetch full financial data from unified endpoint
      let finance: any = null;
      try {
        finance = await dashboardApi.getFinance();
      } catch {
        // Continue without finance data
      }

      const summary = finance?.summary || null;
      const accounts = finance?.accounts || [];
      const investments = finance?.investments || [];
      const breakdown = finance?.breakdown || [];
      const cards = finance?.cards || [];
      const transactions = finance?.transactions || [];

      // --- PDF ---
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentW = pageW - margin * 2;
      let y = 0;

      // Color palette
      const C = {
        primary: [37, 99, 235] as [number, number, number],
        primaryLight: [219, 234, 254] as [number, number, number],
        success: [16, 185, 129] as [number, number, number],
        successLight: [209, 250, 229] as [number, number, number],
        warning: [245, 158, 11] as [number, number, number],
        warningLight: [254, 243, 199] as [number, number, number],
        danger: [239, 68, 68] as [number, number, number],
        dangerLight: [254, 226, 226] as [number, number, number],
        purple: [139, 92, 246] as [number, number, number],
        purpleLight: [237, 233, 254] as [number, number, number],
        dark: [15, 23, 42] as [number, number, number],
        text: [30, 41, 59] as [number, number, number],
        muted: [100, 116, 139] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        border: [226, 232, 240] as [number, number, number],
      };

      const typeLabel = reportTypeLabels[report.typeKey] || report.type;
      const dateStr = (() => {
        try { return format(new Date(report.date), "PPP", { locale: dateLocale }); }
        catch { return report.date; }
      })();

      // ═══ HEADER ═══
      const headerH = 42;
      doc.setFillColor(...C.dark);
      doc.rect(0, 0, pageW, headerH, "F");
      doc.setFillColor(...C.primary);
      doc.rect(0, headerH - 2, pageW, 2, "F");

      doc.setTextColor(...C.white);
      doc.setFontSize(21);
      doc.setFont("helvetica", "bold");
      doc.text(typeLabel, margin, 17);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 200, 230);
      doc.text(`${t("reports:pdf.generated", { defaultValue: "Generated" })}: ${dateStr}`, margin, 27);
      doc.text(`${t("reports:pdf.reportId", { defaultValue: "Report ID" })}: ${report.id.slice(0, 8).toUpperCase()}`, margin, 33);
      if (user?.name || user?.email) {
        doc.text(`${t("reports:pdf.owner", { defaultValue: "Owner" })}: ${user.name || user.email}`, margin, 39);
      }

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.white);
      doc.text("zurT", pageW - margin, 18, { align: "right" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 180, 210);
      doc.text(t("reports:pdf.financialReport", { defaultValue: "Financial Report" }), pageW - margin, 25, { align: "right" });

      y = headerH + 10;

      // ═══ FINANCIAL SUMMARY CARDS ═══
      if (summary) {
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.dark);
        doc.text(t("reports:pdf.financialSummary", { defaultValue: "Financial Summary" }), margin, y);
        y += 7;

        const cardW = (contentW - 9) / 4;
        const cardH = 24;
        const summaryCards = [
          { label: t("reports:pdf.netWorth", { defaultValue: "Net Worth" }), value: formatCurrency(summary.netWorth || 0), color: C.primary, bg: C.primaryLight },
          { label: t("reports:pdf.cash", { defaultValue: "Cash" }), value: formatCurrency(summary.cash || 0), color: C.success, bg: C.successLight },
          { label: t("reports:pdf.investments", { defaultValue: "Investments" }), value: formatCurrency(summary.investments || 0), color: C.purple, bg: C.purpleLight },
          { label: t("reports:pdf.transactions", { defaultValue: "Transactions" }), value: String(transactions.length), color: C.warning, bg: C.warningLight },
        ];

        summaryCards.forEach((card, i) => {
          const cx = margin + i * (cardW + 3);
          doc.setFillColor(...card.bg);
          doc.setDrawColor(...card.color);
          doc.setLineWidth(0.5);
          doc.roundedRect(cx, y, cardW, cardH, 2, 2, "FD");
          doc.setFillColor(...card.color);
          doc.rect(cx, y + 2, 2, cardH - 4, "F");
          doc.setFontSize(7);
          doc.setTextColor(...C.muted);
          doc.setFont("helvetica", "normal");
          doc.text(card.label, cx + 6, y + 8);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...card.color);
          doc.text(card.value, cx + 6, y + 17);
        });
        y += cardH + 10;
      }

      // ═══ ACCOUNTS TABLE ═══
      if (accounts.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.dark);
        doc.text(t("reports:pdf.bankAccounts", { defaultValue: "Bank Accounts" }), margin, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [[
            t("reports:pdf.accountName", { defaultValue: "Account" }),
            t("reports:pdf.type", { defaultValue: "Type" }),
            t("reports:pdf.institution", { defaultValue: "Institution" }),
            t("reports:pdf.balance", { defaultValue: "Balance" }),
          ]],
          body: accounts.map((a: any) => [
            a.name || "—",
            a.type || a.subtype || "—",
            a.institution_name || "—",
            formatCurrency(Number(a.current_balance) || 0),
          ]),
          theme: "grid",
          headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 8, cellPadding: 3.5 },
          bodyStyles: { textColor: C.text, fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 3: { halign: "right", fontStyle: "bold" } },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // ═══ INVESTMENTS TABLE ═══
      if (investments.length > 0 && report.typeKey !== "transactions") {
        if (y > pageH - 50) { doc.addPage(); y = margin; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.dark);
        doc.text(t("reports:pdf.investmentPortfolio", { defaultValue: "Investment Portfolio" }), margin, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [[
            t("reports:pdf.investmentName", { defaultValue: "Name" }),
            t("reports:pdf.type", { defaultValue: "Type" }),
            t("reports:pdf.institution", { defaultValue: "Institution" }),
            t("reports:pdf.quantity", { defaultValue: "Qty" }),
            t("reports:pdf.currentValue", { defaultValue: "Value" }),
          ]],
          body: investments.map((inv: any) => [
            inv.name || "—",
            inv.type || "—",
            inv.institution_name || "—",
            inv.quantity?.toString() || "—",
            formatCurrency(Number(inv.current_value) || 0),
          ]),
          theme: "grid",
          headStyles: { fillColor: C.purple, textColor: C.white, fontStyle: "bold", fontSize: 8, cellPadding: 3.5 },
          bodyStyles: { textColor: C.text, fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [248, 245, 255] },
          columnStyles: { 3: { halign: "center" }, 4: { halign: "right", fontStyle: "bold" } },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // Breakdown
        if (breakdown.length > 0) {
          if (y > pageH - 40) { doc.addPage(); y = margin; }

          const breakdownColors: [number, number, number][] = [
            C.primary, C.success, C.purple, C.warning, C.danger,
            [6, 182, 212], [236, 72, 153], [34, 197, 94], [249, 115, 22], [99, 102, 241],
          ];
          const totalInv = breakdown.reduce((s: number, b: any) => s + (b.total || 0), 0);

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...C.dark);
          doc.text(t("reports:pdf.investmentBreakdown", { defaultValue: "Investment Breakdown" }), margin, y);
          y += 5;

          autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [[
              t("reports:pdf.assetType", { defaultValue: "Asset Type" }),
              t("reports:pdf.count", { defaultValue: "Count" }),
              t("reports:pdf.totalValue", { defaultValue: "Total Value" }),
              t("reports:pdf.share", { defaultValue: "% Share" }),
            ]],
            body: breakdown.map((b: any) => [
              b.type || "—",
              String(b.count || 0),
              formatCurrency(b.total || 0),
              totalInv > 0 ? `${((b.total / totalInv) * 100).toFixed(1)}%` : "—",
            ]),
            theme: "grid",
            headStyles: { fillColor: C.success, textColor: C.white, fontStyle: "bold", fontSize: 8, cellPadding: 3.5 },
            bodyStyles: { textColor: C.text, fontSize: 8, cellPadding: 3 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            columnStyles: { 1: { halign: "center" }, 2: { halign: "right", fontStyle: "bold" }, 3: { halign: "center" } },
            didDrawCell: (data: any) => {
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

      // ═══ CREDIT CARDS ═══
      if (cards.length > 0 && report.typeKey !== "transactions") {
        if (y > pageH - 50) { doc.addPage(); y = margin; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.dark);
        doc.text(t("reports:pdf.creditCards", { defaultValue: "Credit Cards" }), margin, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [[
            t("reports:pdf.card", { defaultValue: "Card" }),
            t("reports:pdf.institution", { defaultValue: "Institution" }),
            t("reports:pdf.openDebt", { defaultValue: "Open Debt" }),
          ]],
          body: cards.map((c: any) => [
            `${c.brand || ""} •••• ${c.last4 || "****"}`.trim(),
            c.institution_name || "—",
            formatCurrency(Number(c.openDebt) || 0),
          ]),
          theme: "grid",
          headStyles: { fillColor: C.warning, textColor: C.white, fontStyle: "bold", fontSize: 8, cellPadding: 3.5 },
          bodyStyles: { textColor: C.text, fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [255, 251, 235] },
          columnStyles: { 2: { halign: "right", fontStyle: "bold", textColor: C.danger } },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // ═══ TRANSACTIONS TABLE ═══
      if (transactions.length > 0) {
        if (y > pageH - 50) { doc.addPage(); y = margin; }

        // Period summary for transaction reports
        if (report.typeKey === "transactions") {
          const income = transactions.filter((tx: any) => Number(tx.amount) > 0).reduce((s: number, tx: any) => s + Number(tx.amount), 0);
          const expenses = transactions.filter((tx: any) => Number(tx.amount) < 0).reduce((s: number, tx: any) => s + Math.abs(Number(tx.amount)), 0);
          const balance = income - expenses;

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...C.dark);
          doc.text(t("reports:pdf.periodSummary", { defaultValue: "Period Summary" }), margin, y);
          y += 7;

          const sumW = (contentW - 6) / 3;
          const sumH = 22;
          const sumCards = [
            { label: t("reports:pdf.income", { defaultValue: "Income" }), value: formatCurrency(income), color: C.success, bg: C.successLight },
            { label: t("reports:pdf.expenses", { defaultValue: "Expenses" }), value: formatCurrency(expenses), color: C.danger, bg: C.dangerLight },
            { label: t("reports:pdf.balance", { defaultValue: "Balance" }), value: formatCurrency(balance), color: balance >= 0 ? C.primary : C.danger, bg: balance >= 0 ? C.primaryLight : C.dangerLight },
          ];

          sumCards.forEach((card, i) => {
            const cx = margin + i * (sumW + 3);
            doc.setFillColor(...card.bg);
            doc.setDrawColor(...card.color);
            doc.setLineWidth(0.4);
            doc.roundedRect(cx, y, sumW, sumH, 2, 2, "FD");
            doc.setFillColor(...card.color);
            doc.rect(cx, y + 2, 2, sumH - 4, "F");
            doc.setFontSize(7);
            doc.setTextColor(...C.muted);
            doc.setFont("helvetica", "normal");
            doc.text(card.label, cx + 6, y + 8);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...card.color);
            doc.text(card.value, cx + 6, y + 17);
          });
          y += sumH + 10;
          if (y > pageH - 50) { doc.addPage(); y = margin; }
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.dark);
        doc.text(t("reports:pdf.recentTransactions", { defaultValue: "Recent Transactions" }), margin, y);
        y += 5;

        const txRows = transactions.slice(0, 50).map((tx: any) => {
          const amt = Number(tx.amount) || 0;
          const d = (() => { try { return format(new Date(tx.date), "dd/MM/yyyy"); } catch { return tx.date || "—"; } })();
          return [d, tx.description || tx.merchant || "—", tx.account_name || tx.institution_name || "—", formatCurrency(amt)];
        });

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [[
            t("reports:pdf.date", { defaultValue: "Date" }),
            t("reports:pdf.description", { defaultValue: "Description" }),
            t("reports:pdf.account", { defaultValue: "Account" }),
            t("reports:pdf.amount", { defaultValue: "Amount" }),
          ]],
          body: txRows,
          theme: "striped",
          headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: "bold", fontSize: 8, cellPadding: 3 },
          bodyStyles: { textColor: C.text, fontSize: 7.5, cellPadding: 2.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { cellWidth: 22 }, 3: { halign: "right", fontStyle: "bold" } },
          didParseCell: (data: any) => {
            if (data.section === "body" && data.column.index === 3) {
              const rawVal = transactions[data.row.index]?.amount;
              if (rawVal != null && Number(rawVal) < 0) data.cell.styles.textColor = C.danger;
              else if (rawVal != null && Number(rawVal) > 0) data.cell.styles.textColor = C.success;
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // ═══ NO DATA ═══
      if (!summary && !accounts.length && !investments.length && !transactions.length) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.muted);
        const msg = t("reports:pdf.noData", { defaultValue: "No financial data available. Connect your bank via Open Finance to generate detailed reports." });
        const lines = doc.splitTextToSize(msg, contentW);
        doc.text(lines, margin, y + 4);
        y += lines.length * 6 + 10;
      }

      // ═══ FOOTER ═══
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 16, pageW - margin, pageH - 16);
        doc.setFillColor(...C.primary);
        doc.circle(margin + 1, pageH - 11, 1, "F");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.muted);
        doc.setFont("helvetica", "normal");
        doc.text(
          t("reports:pdf.footer", { defaultValue: "Confidential — zurT Financial Platform. Generated automatically." }),
          margin + 5, pageH - 10,
        );
        doc.text(`${p} / ${pageCount}`, pageW - margin, pageH - 10, { align: "right" });
        doc.setFontSize(6);
        doc.setTextColor(...C.primary);
        doc.text(typeLabel.toUpperCase(), pageW - margin, pageH - 6, { align: "right" });
      }

      // Save
      const filename = `${report.typeKey}-${new Date().toISOString().slice(0, 10)}-${report.id.slice(0, 8)}.pdf`;
      doc.save(filename);

      toast({ title: t("history.downloadStarted"), description: t("history.downloadDesc"), variant: "success" });
    } catch (err) {
      console.error("PDF export error:", err);
      toast({ title: t("common:error"), description: t("history.downloadError"), variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, user, formatCurrency, t, toast, dateLocale]);

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
                                disabled={downloadingId === report.id}
                              >
                                {downloadingId === report.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Download className="h-4 w-4" />
                                }
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
                        disabled={downloadingId === report.id}
                        aria-label={t("history.downloadPdf")}
                      >
                        {downloadingId === report.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Download className="h-4 w-4" />
                        }
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
