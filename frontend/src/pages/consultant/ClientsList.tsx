import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Search, UserPlus, MoreVertical, EyeOff, FileText, UserMinus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { consultantApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getToastVariantForApiError } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  email: string;
  netWorth: number;
  status: "active" | "pending" | "inactive";
  lastContact: string;
  walletShared?: boolean;
}

const REPORT_TYPES = [
  { value: "consolidated", label: "Relatório Consolidado" },
  { value: "portfolio_analysis", label: "Análise de Portfólio" },
  { value: "financial_planning", label: "Planejamento Financeiro" },
  { value: "monthly", label: "Relatório Mensal" },
  { value: "custom", label: "Relatório Personalizado" },
] as const;

const ClientsList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [unlinkDialogClient, setUnlinkDialogClient] = useState<Client | null>(null);
  const [reportDialogClient, setReportDialogClient] = useState<Client | null>(null);
  const [reportType, setReportType] = useState<string>("consolidated");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debounce search query
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['consultant', 'clients', debouncedSearch],
    queryFn: () => consultantApi.getClients({ search: debouncedSearch || undefined }),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    keepPreviousData: true, // Show previous data while fetching
  });

  const clients = data?.clients || [];
  const loading = isLoading;

  const filteredClients = clients;

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-success/10 text-success",
      pending: "bg-warning/10 text-warning",
      inactive: "bg-muted text-muted-foreground",
    };
    const labels = {
      active: "Ativo",
      pending: "Pendente",
      inactive: "Inativo",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const generateReportMutation = useMutation({
    mutationFn: (payload: { clientId: string; type: string }) =>
      consultantApi.generateReport({ clientId: payload.clientId, type: payload.type }),
    onSuccess: (_, variables) => {
      setReportDialogClient(null);
      setReportType("consolidated");
      queryClient.invalidateQueries({ queryKey: ["consultant", "reports"] });
      toast({
        title: "Relatório solicitado",
        description: "O relatório está sendo gerado. Acesse Relatórios para baixar.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erro",
        description: err?.error || "Não foi possível gerar o relatório",
        variant: getToastVariantForApiError(err),
      });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (clientId: string) => consultantApi.unlinkClient(clientId),
    onSuccess: () => {
      setUnlinkDialogClient(null);
      queryClient.invalidateQueries({ queryKey: ["consultant", "clients"] });
      toast({
        title: "Cliente desvinculado",
        description: "O vínculo com o cliente foi removido.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erro",
        description: err?.error || "Não foi possível desvincular o cliente",
        variant: getToastVariantForApiError(err),
      });
    },
  });

  const handleViewDetails = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    if (client.status !== "active") {
      toast({
        title: "Acesso negado",
        description: client.status === "pending"
          ? "O convite para este cliente ainda está pendente de aceitação."
          : "Não há relacionamento ativo com este cliente.",
        variant: "warning",
      });
      return;
    }
    navigate(`/consultant/clients/${client.id}`);
  };

  const handleGenerateReport = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    if (client.status !== "active") {
      toast({
        title: "Atenção",
        description: "É necessário um relacionamento ativo para gerar relatório.",
        variant: "warning",
      });
      return;
    }
    setReportDialogClient(client);
  };

  const handleUnlink = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnlinkDialogClient(client);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie sua base de clientes
          </p>
        </div>
        <Button asChild>
          <Link to="/consultant/invitations">
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Cliente
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <ChartCard>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </ChartCard>

      {/* Clients List */}
      <ChartCard title={`${clients.length} Cliente${clients.length !== 1 ? "s" : ""}`}>
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">{(error as any)?.error || "Erro ao carregar clientes"}</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Nenhum cliente encontrado
              </p>
            </div>
          ) : (
            clients.map((client) => {
              const handleClientClick = (e: React.MouseEvent) => {
                // If the click is on the dropdown, let it handle itself
                if ((e.target as HTMLElement).closest('[data-radix-collection-item]')) {
                  return;
                }
                
                // Check if relationship is active
                if (client.status !== "active") {
                  e.preventDefault();
                  toast({
                    title: "Acesso negado",
                    description: client.status === "pending" 
                      ? "O convite para este cliente ainda está pendente de aceitação."
                      : "Não há relacionamento ativo com este cliente. O convite pode estar pendente ou revogado.",
                    variant: "warning",
                  });
                  return;
                }
                
                // Navigate to client profile
                navigate(`/consultant/clients/${client.id}`);
              };

              return (
                <div
                  key={client.id}
                  onClick={handleClientClick}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">
                        {client.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">
                          {client.name}
                        </p>
                        {getStatusBadge(client.status)}
                        {client.status === "active" && !client.walletShared && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            <EyeOff className="h-3 w-3" />
                            Carteira oculta
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {client.walletShared
                          ? `Patrimônio: R$ ${client.netWorth.toLocaleString("pt-BR")} • `
                          : "Carteira não compartilhada • "}
                        Último contato: {client.lastContact}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleViewDetails(client, e)}>
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleGenerateReport(client, e)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Gerar relatório
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => handleUnlink(client, e)}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Desvincular
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </div>
      </ChartCard>

      {/* Generate report dialog */}
      <Dialog open={!!reportDialogClient} onOpenChange={(open) => !open && setReportDialogClient(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar relatório</DialogTitle>
            <DialogDescription>
              {reportDialogClient
                ? `Selecione o tipo de relatório para ${reportDialogClient.name}. O arquivo estará disponível em Relatórios.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tipo de relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogClient(null)}>
              Cancelar
            </Button>
            <Button
              disabled={generateReportMutation.isPending}
              onClick={() => {
                if (reportDialogClient) {
                  generateReportMutation.mutate({ clientId: reportDialogClient.id, type: reportType });
                }
              }}
            >
              {generateReportMutation.isPending ? "Gerando…" : "Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink confirmation dialog */}
      <AlertDialog open={!!unlinkDialogClient} onOpenChange={(open) => !open && setUnlinkDialogClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular cliente</AlertDialogTitle>
            <AlertDialogDescription>
              {unlinkDialogClient
                ? `Tem certeza que deseja desvincular ${unlinkDialogClient.name}? O cliente deixará de aparecer na sua lista e você perderá acesso aos dados compartilhados.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinkMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (unlinkDialogClient) {
                  unlinkMutation.mutate(unlinkDialogClient.id);
                }
              }}
              disabled={unlinkMutation.isPending}
            >
              {unlinkMutation.isPending ? "Desvinculando…" : "Desvincular"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientsList;

