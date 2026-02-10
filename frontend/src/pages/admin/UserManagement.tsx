import { useState, useEffect } from "react";
import { Search, Users, RefreshCw, Eye, PieChart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  plan: string | null;
  createdAt: string;
}

const LIMIT_OPTIONS = [5, 10, 20];

const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers({
        search: searchQuery || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        limit: pageSize,
      });
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.error || "Falha ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [page, pageSize, searchQuery, roleFilter, statusFilter]);

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      customer: "bg-blue-500/10 text-blue-500",
      consultant: "bg-purple-500/10 text-purple-500",
      admin: "bg-orange-500/10 text-orange-500",
    };
    const labels: Record<string, string> = {
      customer: "Cliente",
      consultant: "Consultor",
      admin: "Administrador",
    };
    return (
      <Badge className={styles[role] ?? "bg-muted text-muted-foreground"}>
        {labels[role] ?? role}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-500/10 text-green-600",
      blocked: "bg-red-500/10 text-red-600",
      pending: "bg-amber-500/10 text-amber-600",
    };
    const labels: Record<string, string> = {
      active: "Ativo",
      blocked: "Bloqueado",
      pending: "Pendente",
    };
    return (
      <Badge className={styles[status] ?? "bg-muted text-muted-foreground"}>
        {labels[status] ?? status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie usuários, permissões e roles
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <ChartCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as roles</SelectItem>
              <SelectItem value="customer">Cliente</SelectItem>
              <SelectItem value="consultant">Consultor</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ChartCard>

      <ChartCard title={`${pagination.total} Usuário${pagination.total !== 1 ? "s" : ""}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando usuários...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Usuário
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Role
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Plano
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Cadastro
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-sm font-medium text-foreground">Nenhum usuário encontrado</p>
                          <p className="text-xs text-muted-foreground">
                            Ajuste os filtros ou limpe a busca
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">{getRoleBadge(user.role)}</td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(user.status)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-foreground">{user.plan ?? "—"}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {user.role === "customer" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/admin/users/${user.id}/finance`)}
                                title="Ver dados financeiros"
                              >
                                <PieChart className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination section - always visible when there are users */}
            {users.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Mostrando {((page - 1) * pagination.limit) + 1}–{Math.min(page * pagination.limit, pagination.total)} de {pagination.total} usuário{pagination.total !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <label htmlFor="users-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
                        Por página
                      </label>
                      <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                        <SelectTrigger id="users-per-page" className="h-9 w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LIMIT_OPTIONS.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, Math.max(1, pagination.totalPages)) }, (_, i) => {
                        let pageNum: number;
                        const totalP = Math.max(1, pagination.totalPages);
                        if (totalP <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalP - 2) {
                          pageNum = totalP - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            className="min-w-9"
                            onClick={() => setPage(pageNum)}
                            disabled={loading}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(Math.max(1, pagination.totalPages), p + 1))}
                      disabled={page >= Math.max(1, pagination.totalPages) || loading}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </ChartCard>
    </div>
  );
};

export default UserManagement;
