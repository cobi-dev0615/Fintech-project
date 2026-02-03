import { useState, useEffect } from "react";
import { Search, Shield, Mail, Phone, Calendar, TrendingUp, DollarSign, Target, Link2, Users, Eye, Trash2, Edit, Save, X, Filter, Check, XCircle, RefreshCw, UserCheck, PieChart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "consultant" | "admin";
  status: "active" | "blocked" | "pending";
  plan?: string | null;
  createdAt: string;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  countryCode: string;
  isActive: boolean;
  birthDate: string | null;
  riskProfile: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    planName: string;
    planPrice: number;
  } | null;
  financialSummary: {
    cash: number;
    investments: number;
    debt: number;
    netWorth: number;
  };
  stats: {
    connections: number;
    goals: number;
    clients: number;
  };
  consultants: Array<{
    id: string;
    name: string;
    email: string;
    relationshipStatus: string;
    relationshipCreatedAt: string;
  }>;
}

const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRole, setEditingRole] = useState<string>("");
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [registrationRequiresApproval, setRegistrationRequiresApproval] = useState<boolean>(true);
  const [registrationSettingSaving, setRegistrationSettingSaving] = useState(false);
  const navigate = useNavigate();

  // Load registration approval setting on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await adminApi.getSettings();
        setRegistrationRequiresApproval(settings.platformSettings?.registrationRequiresApproval ?? true);
      } catch {
        // Keep default true
      }
    };
    loadSettings();
  }, []);

  const handleRegistrationApprovalToggle = async (checked: boolean) => {
    try {
      setRegistrationSettingSaving(true);
      await adminApi.updateRegistrationApprovalSetting(checked);
      setRegistrationRequiresApproval(checked);
      toast({
        title: "Configuração atualizada",
        description: checked
          ? "Novos usuários precisarão de aprovação do administrador para acessar o sistema."
          : "Novos usuários poderão acessar o sistema automaticamente após o registro.",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.error || "Falha ao atualizar configuração",
        variant: "destructive",
      });
    } finally {
      setRegistrationSettingSaving(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers({ 
        search: searchQuery || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setUsers(response.users.map(user => ({
        ...user,
        role: user.role as "customer" | "consultant" | "admin",
        status: user.status as "active" | "blocked" | "pending",
      })));
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
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
    // Debounce search
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, roleFilter, statusFilter, page]);

  const filteredUsers = users;

  const getRoleBadge = (role: string) => {
    const styles = {
      customer: "bg-blue-500/10 text-blue-500",
      consultant: "bg-purple-500/10 text-purple-500",
      admin: "bg-orange-500/10 text-orange-500",
    };
    const labels = {
      customer: "Cliente",
      consultant: "Consultor",
      admin: "Administrador",
    };
    return (
      <Badge className={styles[role as keyof typeof styles]}>
        {labels[role as keyof typeof labels]}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-success/10 text-success",
      blocked: "bg-destructive/10 text-destructive",
      pending: "bg-warning/10 text-warning",
    };
    const labels = {
      active: "Ativo",
      blocked: "Bloqueado",
      pending: "Pendente",
    };
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setIsDetailDialogOpen(true);
    setIsEditing(false);
    setDetailLoading(true);
    try {
      const response = await adminApi.getUser(user.id);
      setUserDetail(response.user);
      setEditingRole(response.user.role);
      setEditingStatus(response.user.status);
    } catch (error: any) {
      console.error('Failed to fetch user details:', error);
      toast({
        title: "Erro",
        description: error?.error || 'Falha ao carregar detalhes do usuário',
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setIsDetailDialogOpen(false);
    setIsEditing(false);
    setSelectedUser(null);
    setUserDetail(null);
    setEditingRole("");
    setEditingStatus("");
  };

  const handleStartEdit = () => {
    if (userDetail) {
      setEditingRole(userDetail.role);
      setEditingStatus(userDetail.status);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    if (userDetail) {
      setEditingRole(userDetail.role);
      setEditingStatus(userDetail.status);
      setIsEditing(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedUser || !userDetail) return;

    setSaving(true);
    try {
      // Update role if changed
      if (editingRole !== userDetail.role) {
        await adminApi.updateUserRole(selectedUser.id, editingRole);
      }

      // Update status if changed
      if (editingStatus !== userDetail.status) {
        await adminApi.updateUserStatus(selectedUser.id, editingStatus as 'active' | 'blocked');
      }

      // Refresh user detail and table
      const response = await adminApi.getUser(selectedUser.id);
      setUserDetail(response.user);
      fetchUsers();

      setIsEditing(false);
      toast({
        title: "Sucesso",
        description: "Alterações salvas com sucesso",
        variant: "success",
      });
    } catch (error: any) {
      console.error('Failed to save changes:', error);
      toast({
        title: "Erro",
        description: error?.error || 'Falha ao salvar alterações',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUserId(user.id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;

    try {
      await adminApi.deleteUser(deletingUserId);
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
      setDeletingUserId(null);
      // Refresh only the table
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast({
        title: "Erro",
        description: error?.error || 'Falha ao excluir usuário',
        variant: "destructive",
      });
    }
  };

  const handleApproveUser = async (user: User) => {
    try {
      await adminApi.approveUser(user.id);
      toast({
        title: "Sucesso",
        description: `Usuário ${user.name} aprovado com sucesso`,
        variant: "success",
      });
      
      // Optimistically update the user in the list
      setUsers(users.map(u => {
        if (u.id === user.id) {
          return {
            ...u,
            status: 'active' as const,
          };
        }
        return u;
      }));
      
      // Refresh users list to ensure sync with backend
      setLoading(true);
      try {
        const params: any = {
          page: page.toString(),
          limit: pagination.limit.toString(),
        };
        if (searchQuery) params.search = searchQuery;
        if (roleFilter) params.role = roleFilter;
        if (statusFilter) params.status = statusFilter;

        const response = await adminApi.getUsers(params);
        setUsers(response.users.map(user => ({
          ...user,
          role: user.role as "customer" | "consultant" | "admin",
          status: user.status as "active" | "blocked" | "pending",
        })));
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
    } catch (error: any) {
      // If user is already approved, still refresh the table
      if (error?.error?.includes('already approved') || error?.response?.data?.error?.includes('already approved')) {
        toast({
          title: "Informação",
          description: "Usuário já está aprovado. Atualizando lista...",
          variant: "default",
        });
        
        // Refresh only the table
        fetchUsers();
      } else {
        toast({
          title: "Erro",
          description: error?.error || "Falha ao aprovar usuário",
          variant: "destructive",
        });
      }
    }
  };

  const handleShowPortfolio = (user: User) => {
    navigate(`/admin/users/${user.id}/finance`);
  };

  const handleRejectUser = async (user: User) => {
    const reason = prompt("Motivo da rejeição (opcional):");
    try {
      await adminApi.rejectUser(user.id, reason || undefined);
      toast({
        title: "Sucesso",
        description: `Usuário ${user.name} rejeitado com sucesso`,
        variant: "success",
      });
      
      // Optimistically update the user in the list
      setUsers(users.map(u => {
        if (u.id === user.id) {
          return {
            ...u,
            status: 'blocked' as const,
          };
        }
        return u;
      }));
      
      // Refresh users list to ensure sync with backend
      setLoading(true);
      try {
        const params: any = {
          page: page.toString(),
          limit: pagination.limit.toString(),
        };
        if (searchQuery) params.search = searchQuery;
        if (roleFilter) params.role = roleFilter;
        if (statusFilter) params.status = statusFilter;

        const response = await adminApi.getUsers(params);
        setUsers(response.users.map(user => ({
          ...user,
          role: user.role as "customer" | "consultant" | "admin",
          status: user.status as "active" | "blocked" | "pending",
        })));
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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.error || "Falha ao rejeitar usuário",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie usuários, permissões e roles
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Registration approval setting */}
      <ChartCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Aprovação de novos registros</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {registrationRequiresApproval
                  ? "Novos usuários precisam ser aprovados por um administrador antes de acessar o sistema."
                  : "Novos usuários podem acessar o sistema automaticamente após o registro."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="registration-approval" className="text-sm font-medium cursor-pointer">
              {registrationRequiresApproval ? "Requer aprovação" : "Aprovação automática"}
            </Label>
            <Switch
              id="registration-approval"
              checked={!registrationRequiresApproval}
              onCheckedChange={(checked) => handleRegistrationApprovalToggle(!checked)}
              disabled={registrationSettingSaving}
            />
          </div>
        </div>
      </ChartCard>

      {/* Filters */}
      <ChartCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
              {(roleFilter || statusFilter || searchQuery) && (
                <Badge variant="secondary" className="ml-2">
                  {[searchQuery && "Busca", roleFilter && "Role", statusFilter && "Status"].filter(Boolean).length} ativo{(roleFilter && statusFilter && searchQuery) || (roleFilter && statusFilter) || (roleFilter && searchQuery) || (statusFilter && searchQuery) ? "s" : ""}
                </Badge>
              )}
            </div>
            {(roleFilter || statusFilter || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("");
                  setStatusFilter("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1.5" />
                Limpar todos
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative flex-1">
              <Label htmlFor="search" className="sr-only">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  id="search"
                  placeholder="Buscar por nome ou email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Select value={roleFilter || ""} onValueChange={(value) => setRoleFilter(value === "all" ? "" : value)}>
                <SelectTrigger id="role-filter" className={roleFilter ? "border-primary/50" : ""}>
                  <SelectValue placeholder="Selecione uma role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as roles</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="consultant">Consultor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Select value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger id="status-filter" className={statusFilter ? "border-primary/50" : ""}>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(roleFilter || statusFilter || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
              <span className="text-xs font-medium text-muted-foreground mr-1">Filtros aplicados:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                  <Search className="h-3 w-3" />
                  <span className="max-w-[200px] truncate">{searchQuery}</span>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-0.5 hover:bg-background/50 rounded-full p-0.5 transition-colors"
                    aria-label="Remover filtro de busca"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {roleFilter && (
                <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                  <Shield className="h-3 w-3" />
                  <span>{roleFilter === "customer" ? "Cliente" : roleFilter === "consultant" ? "Consultor" : roleFilter}</span>
                  <button
                    onClick={() => setRoleFilter("")}
                    className="ml-0.5 hover:bg-background/50 rounded-full p-0.5 transition-colors"
                    aria-label="Remover filtro de role"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter && (
                <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                  {statusFilter === "active" ? (
                    <span className="h-2 w-2 rounded-full bg-success" />
                  ) : statusFilter === "blocked" ? (
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-warning" />
                  )}
                  <span>{statusFilter === "active" ? "Ativo" : statusFilter === "blocked" ? "Bloqueado" : "Pendente"}</span>
                  <button
                    onClick={() => setStatusFilter("")}
                    className="ml-0.5 hover:bg-background/50 rounded-full p-0.5 transition-colors"
                    aria-label="Remover filtro de status"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </ChartCard>

      {/* Users Table */}
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
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">Nenhum usuário encontrado</p>
                      {(searchQuery || roleFilter || statusFilter) ? (
                        <p className="text-xs text-muted-foreground">
                          Tente ajustar os filtros ou{" "}
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setRoleFilter("");
                              setStatusFilter("");
                            }}
                            className="text-primary hover:underline"
                          >
                            limpar todos os filtros
                          </button>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Não há usuários cadastrados</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
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
                  <td className="py-3 px-4 text-center">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm text-foreground">{user.plan || "-"}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {user.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApproveUser(user)}
                            className="text-success hover:text-success"
                            title="Aprovar"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRejectUser(user)}
                            className="text-destructive hover:text-destructive"
                            title="Rejeitar"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {user.role === "customer" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShowPortfolio(user)}
                          title="Ver dados financeiros"
                        >
                          <PieChart className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(user)}
                        title="Ver Detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(user)}
                        className="text-destructive hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
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
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages || loading}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </ChartCard>

      {/* User Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={(open) => {
        setIsDetailDialogOpen(open);
        if (!open) {
          handleCloseDetail();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas do usuário selecionado
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Carregando detalhes...</p>
            </div>
          ) : userDetail ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Nome</label>
                    <p className="text-sm font-medium">{userDetail.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {userDetail.email}
                    </p>
                  </div>
                  {userDetail.phone && (
                    <div>
                      <label className="text-sm text-muted-foreground">Telefone</label>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {userDetail.phone}
                      </p>
                    </div>
                  )}
                  {userDetail.birthDate && (
                    <div>
                      <label className="text-sm text-muted-foreground">Data de Nascimento</label>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(userDetail.birthDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-muted-foreground">Role</Label>
                    {isEditing ? (
                      <Select value={editingRole} onValueChange={setEditingRole}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Cliente</SelectItem>
                          <SelectItem value="consultant">Consultor</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">
                        {getRoleBadge(userDetail.role)}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    {isEditing ? (
                      <Select value={editingStatus} onValueChange={setEditingStatus}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="blocked">Bloqueado</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">
                        {getStatusBadge(userDetail.status)}
                      </div>
                    )}
                  </div>
                  {userDetail.riskProfile && (
                    <div>
                      <label className="text-sm text-muted-foreground">Perfil de Risco</label>
                      <p className="text-sm font-medium">{userDetail.riskProfile}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-muted-foreground">Data de Cadastro</label>
                    <p className="text-sm font-medium">
                      {new Date(userDetail.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subscription Information */}
              {userDetail.subscription && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Assinatura</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Plano</label>
                      <p className="text-sm font-medium">{userDetail.subscription.planName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Preço</label>
                      <p className="text-sm font-medium">
                        R$ {userDetail.subscription.planPrice.toFixed(2)}/mês
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Status</label>
                      <p className="text-sm font-medium">{userDetail.subscription.status}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Próxima Cobrança</label>
                      <p className="text-sm font-medium">
                        {new Date(userDetail.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Summary */}
              {(userDetail.financialSummary.cash > 0 || userDetail.financialSummary.investments > 0 || userDetail.financialSummary.debt > 0) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Resumo Financeiro</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <label className="text-xs text-muted-foreground">Dinheiro</label>
                      </div>
                      <p className="text-lg font-semibold">
                        R$ {userDetail.financialSummary.cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <label className="text-xs text-muted-foreground">Investimentos</label>
                      </div>
                      <p className="text-lg font-semibold">
                        R$ {userDetail.financialSummary.investments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <label className="text-xs text-muted-foreground">Dívidas</label>
                      </div>
                      <p className="text-lg font-semibold text-destructive">
                        R$ {userDetail.financialSummary.debt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-primary/5">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <label className="text-xs text-muted-foreground">Patrimônio Líquido</label>
                      </div>
                      <p className="text-lg font-semibold text-primary">
                        R$ {userDetail.financialSummary.netWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <label className="text-xs text-muted-foreground">Conexões</label>
                    </div>
                    <p className="text-2xl font-semibold">{userDetail.stats.connections}</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <label className="text-xs text-muted-foreground">Metas</label>
                    </div>
                    <p className="text-2xl font-semibold">{userDetail.stats.goals}</p>
                  </div>
                  {userDetail.role === 'consultant' && (
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <label className="text-xs text-muted-foreground">Clientes</label>
                      </div>
                      <p className="text-2xl font-semibold">{userDetail.stats.clients}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Consultants (if customer) */}
              {userDetail.role === 'customer' && userDetail.consultants.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Consultores Associados</h3>
                  <div className="space-y-2">
                    {userDetail.consultants.map((consultant) => (
                      <div key={consultant.id} className="p-3 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{consultant.name}</p>
                            <p className="text-xs text-muted-foreground">{consultant.email}</p>
                          </div>
                          <Badge variant="outline">{consultant.relationshipStatus}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Associado desde {new Date(consultant.relationshipCreatedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveChanges}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleStartEdit}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Role e Status
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setDeletingUserId(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;

