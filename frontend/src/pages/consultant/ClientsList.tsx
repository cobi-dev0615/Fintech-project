import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { consultantApi } from "@/lib/api-consultant";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Client = {
  id: string;
  name: string;
  email: string;
  netWorth: number;
  status: string;
  lastContact: string;
  walletShared: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  pending: "Pendente",
};

function getStatusBadgeClass(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "active") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (s === "pending") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  if (s === "inactive") return "bg-muted text-muted-foreground border-border";
  return "bg-muted text-muted-foreground border-border";
}

const ClientsList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["consultant-clients", search, status, page, limit],
    queryFn: () => consultantApi.getClients({ search: search || undefined, status: status || undefined, page, limit }),
    placeholderData: (prev) => prev,
  });

  const clients = (data?.clients ?? []) as Client[];
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 };

  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lista de clientes vinculados ao seu perfil
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-lg bg-muted/30 border-border focus-visible:ring-2"
          />
        </div>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-lg bg-muted/30 border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border-2 border-blue-500/70 bg-card overflow-hidden shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
        {isLoading && clients.length === 0 ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48 flex-1 max-w-xs" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-14" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-destructive/70 mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">Erro ao carregar clientes</p>
            <p className="text-xs text-muted-foreground mb-4">{(error as { error?: string })?.error || "Tente novamente em instantes."}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-foreground">Nenhum cliente</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">Ajuste os filtros ou aguarde novos vínculos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border-0 border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border">
                  <TableHead className="font-medium text-muted-foreground">Nome</TableHead>
                  <TableHead className="font-medium text-muted-foreground">E-mail</TableHead>
                  <TableHead className="text-right font-medium text-muted-foreground">Patrimônio</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-muted-foreground">{client.email}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {client.netWorth.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("rounded-full text-xs font-medium border", getStatusBadgeClass(client.status))}>
                        {STATUS_LABELS[(client.status || "").toLowerCase()] ?? client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => navigate(`/consultant/clients/${client.id}`)}
                      >
                        Ver
                        <ChevronRight className="h-4 w-4 ml-0.5 shrink-0" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {!isLoading && !isError && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Mostrando {startItem} a {endItem} de {pagination.total} cliente{pagination.total !== 1 ? "s" : ""}
          </p>
          {pagination.totalPages > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientsList;
