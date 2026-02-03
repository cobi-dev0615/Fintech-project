import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus, MoreVertical, EyeOff } from "lucide-react";
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
import { consultantApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  email: string;
  netWorth: number;
  status: "active" | "pending" | "inactive";
  lastContact: string;
  walletShared?: boolean;
}

const ClientsList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const navigate = useNavigate();
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
                    variant: "destructive",
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
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleClientClick(e as any); }}>Ver detalhes</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Gerar relatório</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
};

export default ClientsList;

