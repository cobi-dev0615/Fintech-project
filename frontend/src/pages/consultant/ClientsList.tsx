import { useState, useEffect } from "react";
import { Search, UserPlus, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { consultantApi } from "@/lib/api";

interface Client {
  id: string;
  name: string;
  email: string;
  netWorth: number;
  status: "active" | "pending" | "inactive";
  lastContact: string;
}

const ClientsList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const data = await consultantApi.getClients({ search: searchQuery || undefined });
        setClients(data.clients);
        setError(null);
      } catch (err: any) {
        setError(err?.error || "Erro ao carregar clientes");
        console.error("Error fetching clients:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchClients();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

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
      <ChartCard title={`${filteredClients.length} Cliente${filteredClients.length !== 1 ? "s" : ""}`}>
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Nenhum cliente encontrado
              </p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <Link
                key={client.id}
                to={`/consultant/clients/${client.id}`}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">
                      {client.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {client.name}
                      </p>
                      {getStatusBadge(client.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {client.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Patrimônio: R$ {client.netWorth.toLocaleString("pt-BR")} • 
                      Último contato: {client.lastContact}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={(e) => e.preventDefault()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem>Gerar relatório</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Desvincular
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Link>
            ))
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default ClientsList;

