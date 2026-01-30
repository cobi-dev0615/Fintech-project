import { useState, useEffect } from "react";
import { FileText, Download, Trash2 } from "lucide-react";
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
import ChartCard from "@/components/dashboard/ChartCard";
import { reportsApi, getApiBaseUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  type: string;
  date: string;
  status: "generated" | "pending";
  downloadUrl?: string | null;
}

function reportDownloadUrl(reportId: string): string {
  const base = getApiBaseUrl();
  return `${base}/reports/${reportId}/file`;
}

const REPORTS_PER_PAGE = 5;

const ReportHistory = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [removeHistoryOpen, setRemoveHistoryOpen] = useState(false);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const totalPages = Math.max(1, Math.ceil(reports.length / REPORTS_PER_PAGE));
  const startIndex = (currentPage - 1) * REPORTS_PER_PAGE;
  const paginatedReports = reports.slice(startIndex, startIndex + REPORTS_PER_PAGE);

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
    } catch (e) {
      toast({
        title: "Erro",
        description: "Não foi possível baixar o relatório.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveHistory = () => {
    setReports([]);
    setCurrentPage(1);
    setRemoveHistoryOpen(false);
    toast({
      title: "Histórico removido",
      description: "A lista de relatórios foi limpa da visualização.",
    });
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Relatórios gerados e disponíveis para download
          </p>
        </div>
      </div>

      <ChartCard
        title="Relatórios Gerados"
        actions={
          reports.length > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemoveHistoryOpen(true)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remover histórico da visualização</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null
        }
      >
        {loading ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Nenhum relatório gerado ainda
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Tipo
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Data
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {paginatedReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
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
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDownload(report.id)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Baixar PDF</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteReportId(report.id)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remover relatório</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}–
                  {Math.min(startIndex + REPORTS_PER_PAGE, reports.length)} de{" "}
                  {reports.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
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
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </ChartCard>

      <AlertDialog open={removeHistoryOpen} onOpenChange={setRemoveHistoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              A lista de relatórios será limpa desta tela. Os relatórios continuam
              no servidor e voltarão a aparecer ao atualizar a página.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveHistory}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
