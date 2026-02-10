import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Trash2, User, Calendar, Loader2, FilePlus } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const REPORTS_PAGE_SIZE = 10;

interface Report {
  id: string;
  clientName: string;
  type: string;
  generatedAt: string;
  status: string;
  hasWatermark: boolean;
  downloadUrl?: string | null;
}

const ProfessionalReports = () => {
  const [selectedClient, setSelectedClient] = useState("all");
  const [reportType, setReportType] = useState("");
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [customBranding, setCustomBranding] = useState(false);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [reportsPage, setReportsPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reportTypes = [
    "consolidated",
    "portfolio_analysis",
    "financial_planning",
    "monthly",
    "custom",
  ];

  const reportTypeLabels: Record<string, string> = {
    consolidated: "Relatório Consolidado",
    portfolio_analysis: "Análise de Portfólio",
    financial_planning: "Planejamento Financeiro",
    monthly: "Relatório Mensal",
    custom: "Relatório Personalizado",
  };

  const reportTypeDescriptions: Record<string, string> = {
    consolidated: "Visão única do cliente: resumo (patrimônio, rentabilidade, saldo em contas, dívida), contas bancárias, cartões de crédito, investimentos e histórico de transações dos últimos 3 meses.",
    portfolio_analysis: "Análise de portfólio do cliente: resumo financeiro, contas, cartões, composição de investimentos e histórico de transações e investimentos.",
    financial_planning: "Portfólio completo do cliente mais uma seção de planejamento com objetivos e recomendações para uso em reuniões de acompanhamento.",
    monthly: "Relatório mensal com resumo do período (receitas, despesas, saldo) e tabela de movimentações para o intervalo selecionado.",
    custom: "Relatório personalizado com a mesma visão consolidada do cliente: resumo, contas, cartões, investimentos e transações recentes.",
  };

  // Fetch reports and clients in parallel with caching
  const { data: reportsData, isLoading: reportsLoading, error: reportsError } = useQuery({
    queryKey: ['consultant', 'reports'],
    queryFn: () => consultantApi.getReports(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60000, // Refetch every minute to check for completed reports
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['consultant', 'clients', 'active'],
    queryFn: () => consultantApi.getClients({ status: 'active', limit: 100 }),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const reports = reportsData?.reports || [];
  const clients = clientsData?.clients?.map((c: any) => ({ id: c.id, name: c.name })) || [];
  const loading = reportsLoading || clientsLoading;

  const generateMutation = useMutation({
    mutationFn: (params: {
      clientId?: string;
      type: string;
      includeWatermark: boolean;
      customBranding: boolean;
    }) => consultantApi.generateReport(params),
    onSuccess: (result) => {
      // Invalidate and refetch reports
      queryClient.invalidateQueries({ queryKey: ['consultant', 'reports'] });
      toast({
        title: "Sucesso",
        description: result.message || "Relatório iniciado. Estará disponível em breve.",
        variant: "success",
      });
      setSelectedClient("all");
      setReportType("");
      setIncludeWatermark(true);
      setCustomBranding(false);
    },
    onError: (err: any) => {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao gerar relatório",
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
      if (!res.ok) throw new Error("Falha ao baixar");
      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? `relatorio-${reportId}.pdf`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível baixar o relatório.", variant: "destructive" });
    }
  };

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => consultantApi.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'reports'] });
      setDeleteReportId(null);
      toast({ title: "Relatório removido", description: "O relatório foi excluído.", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.error || "Erro ao excluir relatório", variant: "destructive" });
    },
  });

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast({
        title: "Erro",
        description: "Selecione um tipo de relatório",
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
        return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
      } else if (diffInHours < 48) {
        return `Ontem ${format(date, 'HH:mm', { locale: ptBR })}`;
      } else {
        return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-1">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Relatórios Profissionais</h1>
          <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Crie e gerencie relatórios personalizados para seus clientes
          </p>
        </div>
      </div>

      {/* Report Generator */}
      <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FilePlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Gerar Novo Relatório</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Escolha o cliente, tipo e opções e gere o PDF</p>
          </div>
        </div>
        <div className="space-y-5 md:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm font-medium">Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger id="client" className="h-11 min-h-11 touch-manipulation">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Geral (sem cliente específico)</SelectItem>
                  {clientsLoading ? (
                    <SelectItem value="loading" disabled>Carregando clientes...</SelectItem>
                  ) : clients.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhum cliente ativo</SelectItem>
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
              <Label htmlFor="type" className="text-sm font-medium">Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="type" className="h-11 min-h-11 touch-manipulation">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {reportTypeLabels[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reportType && reportTypeDescriptions[reportType] && (
                <p className="text-xs text-muted-foreground mt-1.5 pl-0.5">
                  {reportTypeDescriptions[reportType]}
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
                Incluir marca d'água do consultor
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
                Incluir logotipo e identidade visual personalizada
              </Label>
            </div>
          </div>

          <Button 
            className="w-full md:w-auto min-h-11 touch-manipulation text-base font-medium" 
            disabled={!reportType || generateMutation.isPending || clients.length === 0} 
            onClick={handleGenerateReport}
          >
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" /> : <FileText className="h-4 w-4 mr-2 shrink-0" />}
            {generateMutation.isPending ? "Gerando..." : "Gerar Relatório PDF"}
          </Button>
          {clients.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Você precisa ter clientes ativos para gerar relatórios.
            </p>
          )}
        </div>
      </div>

      {/* Reports History */}
      <div className="rounded-xl border-2 border-violet-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-shadow min-w-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Relatórios Gerados</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {reportsTotal > 0
                ? reportsTotalPages > 1
                  ? `${reportsStart + 1}–${reportsEnd} de ${reportsTotal} relatório(s)`
                  : `${reportsTotal} relatório(s)`
                : "Histórico de relatórios"}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : reportsError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-destructive/70" />
              <p className="text-sm font-medium text-foreground">Erro ao carregar relatórios</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(reportsError as any)?.error || "Tente novamente mais tarde"}
              </p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">
                {selectedClient !== "all" ? "Nenhum relatório para este cliente" : "Nenhum relatório gerado ainda"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedClient !== "all" ? "Altere o filtro de cliente acima ou gere um novo relatório" : "Gere seu primeiro relatório no formulário acima"}
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
                        {reportTypeLabels[report.type] || report.type}
                      </h3>
                      <Badge className="text-xs shrink-0 hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-600/90 text-white border-0">
                        Gerado
                      </Badge>
                      {report.hasWatermark && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          <User className="h-3 w-3 mr-1" />
                          Marca d'água
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
                {/* Mobile: status + time + buttons in one line. Desktop: buttons only */}
                <div className="flex items-center gap-2 sm:gap-2 shrink-0 border-t border-border pt-3 sm:pt-0 sm:border-t-0 flex-wrap">
                  <Badge className="text-xs shrink-0 sm:hidden bg-emerald-600 hover:bg-emerald-600/90 text-white border-0">
                    Gerado
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
                      aria-label="Baixar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive min-h-10 min-w-10 touch-manipulation p-2"
                      onClick={() => setDeleteReportId(report.id)}
                      aria-label="Excluir relatório"
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
                  Página {safePage} de {reportsTotalPages}
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
      </div>

      <AlertDialog open={!!deleteReportId} onOpenChange={(open) => !open && setDeleteReportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O relatório será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReportMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReportId && deleteReportMutation.mutate(deleteReportId)}
              disabled={deleteReportMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReportMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfessionalReports;
