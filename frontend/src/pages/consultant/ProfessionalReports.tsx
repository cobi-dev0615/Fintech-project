import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Plus, Settings, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Report {
  id: string;
  clientName: string;
  type: string;
  generatedAt: string;
  status: "generated" | "pending";
  hasWatermark: boolean;
  downloadUrl?: string | null;
}

const ProfessionalReports = () => {
  const [selectedClient, setSelectedClient] = useState("all");
  const [reportType, setReportType] = useState("");
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [customBranding, setCustomBranding] = useState(false);
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

  // Filter reports by selected client
  const filteredReports = selectedClient === "all" 
    ? reports 
    : reports.filter((r: Report) => {
        const client = clients.find((c: any) => c.id === selectedClient);
        return client && r.clientName === client.name;
      });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios Profissionais</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e gerencie relatórios personalizados para seus clientes
          </p>
        </div>
      </div>

      {/* Report Generator */}
      <ChartCard title="Gerar Novo Relatório">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger id="client">
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
              <Label htmlFor="type">Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="type">
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
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="watermark"
                checked={includeWatermark}
                onCheckedChange={(checked) => setIncludeWatermark(checked as boolean)}
              />
              <Label htmlFor="watermark" className="cursor-pointer">
                Incluir marca d'água do consultor
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="branding"
                checked={customBranding}
                onCheckedChange={(checked) => setCustomBranding(checked as boolean)}
              />
              <Label htmlFor="branding" className="cursor-pointer">
                Incluir logotipo e identidade visual personalizada
              </Label>
            </div>
          </div>

          <Button 
            className="w-full md:w-auto" 
            disabled={!reportType || generateMutation.isLoading || clients.length === 0} 
            onClick={handleGenerateReport}
          >
            <FileText className="h-4 w-4 mr-2" />
            {generateMutation.isLoading ? "Gerando..." : "Gerar Relatório PDF"}
          </Button>
          {clients.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Você precisa ter clientes ativos para gerar relatórios específicos.
            </p>
          )}
        </div>
      </ChartCard>

      {/* Reports History */}
      <ChartCard title="Relatórios Gerados">
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : reportsError ? (
            <div className="text-center py-12 text-destructive">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Erro ao carregar relatórios</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(reportsError as any)?.error || "Tente novamente mais tarde"}
              </p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum relatório gerado ainda</p>
              <p className="text-sm mt-2">
                {selectedClient !== "all" ? "Nenhum relatório encontrado para este cliente" : "Gere seu primeiro relatório acima"}
              </p>
            </div>
          ) : (
            filteredReports.map((report: Report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground">
                        {reportTypeLabels[report.type] || report.type}
                      </h3>
                      <Badge variant={report.status === "generated" ? "default" : "secondary"}>
                        {report.status === "generated" ? "Gerado" : "Pendente"}
                      </Badge>
                      {report.hasWatermark && (
                        <Badge variant="outline" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          Marca d'água
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {report.clientName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatReportDate(report.generatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                {report.downloadUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={report.downloadUrl} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Processando...
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default ProfessionalReports;
