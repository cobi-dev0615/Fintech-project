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
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation(['admin', 'common']);
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
        title: t('common:error'),
        description: error?.error || t('common:errorLoading'),
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
    const getRoleLabel = (r: string) => {
      if (r === 'customer') return t('admin:userManagement.roles.customer');
      if (r === 'consultant') return t('admin:userManagement.roles.consultant');
      if (r === 'admin') return t('admin:userManagement.roles.admin');
      return r;
    };
    return (
      <Badge className={styles[role] ?? "bg-muted text-muted-foreground"}>
        {getRoleLabel(role)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-500/10 text-green-600",
      blocked: "bg-red-500/10 text-red-600",
      pending: "bg-amber-500/10 text-amber-600",
    };
    const getStatusLabel = (s: string) => {
      if (s === 'active') return t('admin:userManagement.status.active');
      if (s === 'blocked') return t('admin:userManagement.status.suspended');
      if (s === 'pending') return t('admin:userManagement.status.inactive');
      return s;
    };
    return (
      <Badge className={styles[status] ?? "bg-muted text-muted-foreground"}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin:userManagement.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin:userManagement.subtitle')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t('common:refresh')}
        </Button>
      </div>

      <ChartCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin:userManagement.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('admin:userManagement.tableHeaders.role')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin:userManagement.filters.all')}</SelectItem>
              <SelectItem value="customer">{t('admin:userManagement.roles.customer')}</SelectItem>
              <SelectItem value="consultant">{t('admin:userManagement.roles.consultant')}</SelectItem>
              <SelectItem value="admin">{t('admin:userManagement.roles.admin')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('admin:userManagement.tableHeaders.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin:userManagement.filters.all')}</SelectItem>
              <SelectItem value="active">{t('admin:userManagement.status.active')}</SelectItem>
              <SelectItem value="blocked">{t('admin:userManagement.status.suspended')}</SelectItem>
              <SelectItem value="pending">{t('admin:userManagement.status.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ChartCard>

      <ChartCard title={`${pagination.total} ${pagination.total === 1 ? t('admin:userManagement.tableHeaders.name') : t('admin:userManagement.tableHeaders.name') + 's'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('admin:userManagement.loading')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:userManagement.tableHeaders.name')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:userManagement.tableHeaders.role')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:userManagement.tableHeaders.status')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('common:plan')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:userManagement.tableHeaders.createdAt')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:userManagement.tableHeaders.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-sm font-medium text-foreground">{t('admin:userManagement.empty')}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('common:adjustFilters')}
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
                            {new Date(user.createdAt).toLocaleDateString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {user.role === "customer" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/admin/users/${user.id}/finance`)}
                                title={t('admin:customerFinance.title')}
                              >
                                <PieChart className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('admin:userManagement.viewDetails')}
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
                      {t('common:showingResults', {
                        from: ((page - 1) * pagination.limit) + 1,
                        to: Math.min(page * pagination.limit, pagination.total),
                        total: pagination.total
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <label htmlFor="users-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
                        {t('common:perPage')}
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
                      {t('common:previous')}
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
                      {t('common:next')}
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
