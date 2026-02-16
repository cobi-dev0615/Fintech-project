import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Users,
  RefreshCw,
  Eye,
  PieChart,
  UserCheck,
  Briefcase,
  GripVertical,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

// --- Types ---

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  plan: string | null;
  createdAt: string;
}

interface UserKpiDef {
  title: string;
  value: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableUserKpiCard({ id, kpi }: { id: string; kpi: UserKpiDef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "z-50 opacity-50 scale-105" : ""}`}
    >
      <button
        type="button"
        className="drag-handle absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/80 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none rounded-md p-1 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="kpi-card relative overflow-hidden h-full">
        <kpi.watermark className="absolute -bottom-3 -right-3 h-24 w-24 text-muted-foreground/[0.06] pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-3 relative z-10">
          <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground truncate">
            {kpi.title}
          </span>
        </div>

        <div className="relative z-10">
          <div className="text-2xl sm:text-[28px] font-bold text-foreground mb-1 tabular-nums tracking-tight leading-none">
            {kpi.value}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Constants ---

const USER_KPI_IDS = ["usr-total", "usr-customers", "usr-consultants", "usr-active"] as const;
const LIMIT_OPTIONS = [5, 10, 20];

// --- Component ---

const UserManagement = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { user: authUser } = useAuth();
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

  // --- KPI DnD ---

  const kpiStorageKey = `admin-users-kpi-order-${authUser?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === USER_KPI_IDS.length &&
          USER_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...USER_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleKpiDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setKpiOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, moved);
      localStorage.setItem(kpiStorageKey, JSON.stringify(next));
      return next;
    });
  };

  // --- KPI Computation ---

  const kpiData = useMemo(() => {
    const totalUsers = pagination.total;
    const customerCount = users.filter((u) => u.role === "customer").length;
    const consultantCount = users.filter((u) => u.role === "consultant").length;
    const activeCount = users.filter((u) => u.status === "active").length;

    return {
      "usr-total": {
        title: t('admin:userManagement.kpis.totalUsers'),
        value: String(totalUsers),
        changeType: "neutral" as const,
        icon: Users,
        watermark: Users,
      },
      "usr-customers": {
        title: t('admin:userManagement.kpis.customers'),
        value: String(customerCount),
        changeType: "neutral" as const,
        icon: Users,
        watermark: Users,
      },
      "usr-consultants": {
        title: t('admin:userManagement.kpis.consultants'),
        value: String(consultantCount),
        changeType: "neutral" as const,
        icon: Briefcase,
        watermark: Briefcase,
      },
      "usr-active": {
        title: t('admin:userManagement.kpis.activeUsers'),
        value: String(activeCount),
        changeType: "positive" as const,
        icon: UserCheck,
        watermark: UserCheck,
      },
    };
  }, [users, pagination.total, t]);

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
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiOrder.map((id) => (
              <SortableUserKpiCard key={id} id={id} kpi={kpiData[id as keyof typeof kpiData]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Users Table */}
      <ChartCard
        title={t('admin:userManagement.title')}
        subtitle={t('admin:userManagement.subtitle')}
        actions={
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t('common:refresh')}
          </Button>
        }
      >
        {/* Filters */}
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

        {/* Table */}
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

            {/* Pagination */}
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
