import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, Download, Trash2, ChevronLeft, ChevronRight, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [typeFilter, setTypeFilter] = useState<string>(FILTER_ALL);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

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

  // Reset to page 1 when filter or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, pageSize]);

  const reportTypeLabels: Record<string, string> = {
    consolidated: "Relatório Consolidado",
    transactions: "Extrato de Transações",
    portfolio_analysis: "Evolução de Investimentos",
    monthly: "Relatório Mensal",
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await reportsApi.getAll();
      setReports(
        data.reports.map((r) => ({
          id: r.id,
          type: reportTypeLabels[r.type] || r.type,
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
      if (!res.ok) throw new Error("Falha ao baixar");
      const blob = await res.blob();
      const name =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `relatorio-${reportId}.pdf`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "Download iniciado", description: "O PDF está sendo baixado." });
    } catch (e) {
      toast({
        title: "Erro",
        description: "Não foi possível baixar o relatório.",
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
      toast({ title: "Relatório removido", description: "O relatório foi excluído." });
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e?.error ?? "Não foi possível remover o relatório.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Histórico de Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Relatórios gerados e disponíveis para download
          </p>
        </div>
        <Link to="/app/reports">
          <Button variant="outline" size="sm" className="shrink-0">
            <FilePlus className="h-4 w-4 mr-2" />
            Gerar novo relatório
          </Button>
        </Link>
      </div>

      <ChartCard
        title="Relatórios Gerados"
        subtitle={!loading && filteredReports.length > 0 ? `${filteredReports.length} relatório(s)` : undefined}
        className="min-w-0 overflow-hidden"
        actions={
          !loading && reports.length > 0 ? (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>Todos os tipos</SelectItem>
                {Object.entries(reportTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      >
        {loading ? (
          <>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">Nenhum relatório gerado ainda</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              Gere seu primeiro relatório na página Relatórios e ele aparecerá aqui.
            </p>
            <Link to="/app/reports">
              <Button className="gap-2">
                <FilePlus className="h-4 w-4" />
                Ir para Relatórios
              </Button>
            </Link>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Nenhum relatório encontrado para o filtro selecionado.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setTypeFilter(FILTER_ALL)}>
              Limpar filtro
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
                      Tipo
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Data
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ações
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
                        Gerado em {report.date}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <TooltipProvider>
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
                                <p>Baixar PDF</p>
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
                                <p>Remover relatório</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
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
                        aria-label="Baixar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteReportId(report.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remover relatório"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gerado em {report.date}
                  </p>
                </div>
              ))}
            </div>

            {filteredReports.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1}–
                    {Math.min(startIndex + pageSize, filteredReports.length)} de{" "}
                    {filteredReports.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <label htmlFor="reports-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
                      Por página
                    </label>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => setPageSize(Number(v))}
                    >
                      <SelectTrigger id="reports-per-page" className="w-[4.5rem] h-9" aria-label="Relatórios por página">
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
                    aria-label="Página anterior"
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
                    aria-label="Próxima página"
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
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              Este relatório será removido permanentemente do servidor e não poderá ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removendo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReportHistory;
