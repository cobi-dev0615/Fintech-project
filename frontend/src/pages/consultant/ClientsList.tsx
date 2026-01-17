import { useState } from "react";
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

  const clients: Client[] = [
    {
      id: "1",
      name: "João Silva",
      email: "joao.silva@email.com",
      netWorth: 450000,
      status: "active",
      lastContact: "Hoje",
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria.santos@email.com",
      netWorth: 820000,
      status: "active",
      lastContact: "Ontem",
    },
    {
      id: "3",
      name: "Pedro Costa",
      email: "pedro.costa@email.com",
      netWorth: 320000,
      status: "pending",
      lastContact: "Há 3 dias",
    },
    {
      id: "4",
      name: "Ana Oliveira",
      email: "ana.oliveira@email.com",
      netWorth: 1250000,
      status: "active",
      lastContact: "Há 5 dias",
    },
    {
      id: "5",
      name: "Carlos Mendes",
      email: "carlos.mendes@email.com",
      netWorth: 280000,
      status: "inactive",
      lastContact: "Há 2 semanas",
    },
  ];

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Link to="/consultant/clients/invite">
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
          {filteredClients.length === 0 ? (
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

