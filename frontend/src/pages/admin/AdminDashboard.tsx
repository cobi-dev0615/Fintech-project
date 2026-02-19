import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect, useCallback, useState, memo } from "react";
import {
  Users,
  TrendingUp,
  Activity,
  UserPlus,
  DollarSign,
  RefreshCw,
  GripVertical,
  ShieldCheck,
  CreditCard,
  Bell,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// --- Types ---

interface AdminKpiDef {
  title: string;
  value: string;
  subtitle?: string;
  growth?: number;
  growthSuffix?: string;
  invertGrowthColor?: boolean;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableAdminKpiCard({ id, kpi }: { id: string; kpi: AdminKpiDef }) {
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
          <div className="flex items-center gap-2">
            {kpi.subtitle && (
              <span className="text-xs text-muted-foreground">{kpi.subtitle}</span>
            )}
            {kpi.growth !== undefined && kpi.growth !== 0 && (
              <span className={cn(
                "text-xs font-medium tabular-nums",
                kpi.invertGrowthColor
                  ? (kpi.growth > 0 ? "text-destructive" : "text-success")
                  : (kpi.growth > 0 ? "text-success" : "text-destructive")
              )}>
                {kpi.growth > 0 ? "+" : ""}{kpi.growth}{kpi.growthSuffix ?? "%"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Constants ---

const ADMIN_KPI_IDS = ["adm-users", "adm-revenue", "adm-churn", "adm-new-users"] as const;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const getCurrentYear = () => new Date().getFullYear();
const getYearOptions = () => {
  const y = getCurrentYear();
  return [y, y - 1, y - 2, y - 3, y - 4];
};

const ROLE_COLORS = ['#3b82f6', '#8b5cf6'];
const CONNECTION_STATUS_COLORS: Record<string, string> = {
  connected: '#22c55e',
  pending: '#f59e0b',
  needs_reauth: '#f97316',
  failed: '#ef4444',
  revoked: '#6b7280',
};

// --- Isolated Charts ---

const UserGrowthChart = memo(function UserGrowthChart({ t }: { t: any }) {
  const [year, setYear] = useState(getCurrentYear());
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'dashboard', 'userGrowth', year],
    queryFn: () => adminApi.getDashboardMetrics(year),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
  const chartData = useMemo(() => {
    const raw = data?.userGrowth ?? [];
    const map = new Map(raw.map((r: { month: string; users: number }) => [r.month, r.users]));
    return MONTH_NAMES.map((month) => ({ month, users: map.get(month) ?? 0 }));
  }, [data?.userGrowth]);

  return (
    <ChartCard
      title={t('admin:dashboard.userGrowth')}
      subtitle={t('admin:dashboard.userGrowthSubtitle')}
      actions={
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
            <SelectTrigger className="w-[100px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {getYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin:dashboard.refreshChart')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      }
    >
      <div className="h-64 relative">
        {isFetching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <filter id="userGrowthGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={50} />
              <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }} />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2.5} fill="url(#userGrowthGradient)" filter="url(#userGrowthGlow)" dot={false} activeDot={{ r: 5, fill: "#3b82f6", stroke: "#1d4ed8", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('admin:dashboard.noDataAvailable')}
          </div>
        )}
      </div>
    </ChartCard>
  );
});

const RevenueChart = memo(function RevenueChart({ t }: { t: any }) {
  const { formatCurrency } = useCurrency();
  const [year, setYear] = useState(getCurrentYear());
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'dashboard', 'revenue', year],
    queryFn: () => adminApi.getDashboardMetrics(year),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
  const chartData = useMemo(() => {
    const raw = data?.revenue ?? [];
    const map = new Map(raw.map((r: { month: string; revenue: number }) => [r.month, r.revenue]));
    return MONTH_NAMES.map((month) => ({ month, revenue: map.get(month) ?? 0 }));
  }, [data?.revenue]);

  return (
    <ChartCard
      title={t('admin:dashboard.revenue')}
      subtitle={t('admin:dashboard.revenueSubtitle')}
      actions={
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
            <SelectTrigger className="w-[100px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {getYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('admin:dashboard.refreshChart')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      }
    >
      <div className="h-64 relative">
        {isFetching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
                </linearGradient>
                <filter id="revenueBarShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.3" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v)} width={70} />
              <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }} formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="url(#revenueBarGradient)" radius={[6, 6, 0, 0]} filter="url(#revenueBarShadow)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('admin:dashboard.noDataAvailable')}
          </div>
        )}
      </div>
    </ChartCard>
  );
});

// --- New Dashboard Sections ---

const RecentRegistrationsTable = memo(function RecentRegistrationsTable({ t, data }: { t: any; data: any }) {
  const registrations = data?.recentRegistrations ?? [];

  return (
    <ChartCard
      title={t('admin:dashboard.recentRegistrations.title')}
      subtitle={t('admin:dashboard.recentRegistrations.subtitle')}
    >
      {registrations.length > 0 ? (
        <div className="space-y-1">
          {registrations.map((user: any) => (
            <div key={user.id} className="flex items-center justify-between py-2.5 border-b border-white/10 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge variant="secondary" className="text-[10px]">
                  {t(`admin:dashboard.recentRegistrations.roles.${user.role}`)}
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <UserPlus className="h-8 w-8 mb-2 opacity-30" />
          <span className="text-sm">{t('admin:dashboard.recentRegistrations.empty')}</span>
        </div>
      )}
    </ChartCard>
  );
});

const RoleDistributionChart = memo(function RoleDistributionChart({ t, data }: { t: any; data: any }) {
  const distribution = data?.roleDistribution ?? [];
  const chartData = distribution.map((item: any) => ({
    name: item.role === 'customer'
      ? t('admin:dashboard.roleDistribution.customers')
      : t('admin:dashboard.roleDistribution.consultants'),
    value: item.count,
  }));
  const total = chartData.reduce((sum: number, item: any) => sum + item.value, 0);

  return (
    <ChartCard
      title={t('admin:dashboard.roleDistribution.title')}
      subtitle={t('admin:dashboard.roleDistribution.subtitle')}
    >
      <div className="h-56 relative">
        {chartData.length > 0 && total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('admin:dashboard.noDataAvailable')}
          </div>
        )}
        {total > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{total}</div>
              <div className="text-xs text-muted-foreground">{t('admin:dashboard.kpis.totalUsers')}</div>
            </div>
          </div>
        )}
      </div>
      {chartData.length > 0 && total > 0 && (
        <div className="flex justify-center gap-6 mt-2">
          {chartData.map((item: any, index: number) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ROLE_COLORS[index] }} />
              <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
});

const PendingApprovalsCard = memo(function PendingApprovalsCard({ t, data }: { t: any; data: any }) {
  const count = data?.pendingApprovals ?? 0;

  return (
    <ChartCard
      title={t('admin:dashboard.pendingApprovals.title')}
      subtitle={t('admin:dashboard.pendingApprovals.subtitle')}
    >
      <div className="flex flex-col items-center justify-center py-6">
        <ShieldCheck className={cn("h-10 w-10 mb-3", count > 0 ? "text-amber-500" : "text-muted-foreground/30")} />
        <div className="text-3xl font-bold text-foreground tabular-nums mb-1">
          {count}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {count > 0
            ? t('admin:dashboard.pendingApprovals.count', { count })
            : t('admin:dashboard.pendingApprovals.noPending')}
        </p>
        {count > 0 && (
          <Link to="/admin/users?status=pending">
            <Button variant="outline" size="sm">
              {t('admin:dashboard.pendingApprovals.viewAll')}
            </Button>
          </Link>
        )}
      </div>
    </ChartCard>
  );
});

const SubscriptionStatsCard = memo(function SubscriptionStatsCard({ t, data }: { t: any; data: any }) {
  const stats = data?.subscriptionStats ?? { total: 0, active: 0, canceled: 0, trialing: 0, pastDue: 0, paused: 0 };

  const items = [
    { label: t('admin:dashboard.subscriptionStats.active'), value: stats.active, color: 'text-success' },
    { label: t('admin:dashboard.subscriptionStats.canceled'), value: stats.canceled, color: 'text-destructive' },
    { label: t('admin:dashboard.subscriptionStats.trialing'), value: stats.trialing, color: 'text-blue-500' },
    { label: t('admin:dashboard.subscriptionStats.pastDue'), value: stats.pastDue, color: 'text-amber-500' },
    { label: t('admin:dashboard.subscriptionStats.paused'), value: stats.paused, color: 'text-muted-foreground' },
  ];

  return (
    <ChartCard
      title={t('admin:dashboard.subscriptionStats.title')}
      subtitle={t('admin:dashboard.subscriptionStats.subtitle')}
    >
      <div className="space-y-4">
        <div className="text-center py-2">
          <div className="text-3xl font-bold text-foreground tabular-nums">{stats.total}</div>
          <p className="text-xs text-muted-foreground">{t('admin:dashboard.subscriptionStats.total')}</p>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className={cn("text-sm font-semibold tabular-nums", item.color)}>{item.value}</span>
            </div>
          ))}
        </div>
        {stats.total > 0 && (
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-500"
              style={{ width: `${(stats.active / stats.total) * 100}%` }}
            />
          </div>
        )}
      </div>
    </ChartCard>
  );
});

const RecentNotificationsCard = memo(function RecentNotificationsCard({ t, data }: { t: any; data: any }) {
  const notifications = data?.recentNotifications ?? [];

  return (
    <ChartCard
      title={t('admin:dashboard.recentNotifications.title')}
      subtitle={t('admin:dashboard.recentNotifications.subtitle')}
    >
      {notifications.length > 0 ? (
        <div className="space-y-1">
          {notifications.map((notif: any) => (
            <div key={notif.id} className="flex items-start gap-3 py-2.5 border-b border-white/10 last:border-0">
              <div className={cn(
                "shrink-0 mt-1.5 w-2 h-2 rounded-full",
                notif.resolved ? 'bg-muted-foreground/30' :
                  (notif.severity === 'critical' || notif.type === 'error') ? 'bg-red-500' :
                  notif.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
              )} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground line-clamp-2">{notif.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {t(`admin:dashboard.recentNotifications.types.${notif.type}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(notif.time).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Bell className="h-8 w-8 mb-2 opacity-30" />
          <span className="text-sm">{t('admin:dashboard.recentNotifications.empty')}</span>
        </div>
      )}
    </ChartCard>
  );
});

const ConnectionsOverviewCard = memo(function ConnectionsOverviewCard({ t, data }: { t: any; data: any }) {
  const connections = data?.connectionsByStatus ?? [];
  const total = connections.reduce((sum: number, c: any) => sum + c.count, 0);

  const statusLabels: Record<string, string> = {
    connected: t('admin:dashboard.connectionsOverview.connected'),
    pending: t('admin:dashboard.connectionsOverview.pending'),
    needs_reauth: t('admin:dashboard.connectionsOverview.needsReauth'),
    failed: t('admin:dashboard.connectionsOverview.failed'),
    revoked: t('admin:dashboard.connectionsOverview.revoked'),
  };

  return (
    <ChartCard
      title={t('admin:dashboard.connectionsOverview.title')}
      subtitle={t('admin:dashboard.connectionsOverview.subtitle')}
    >
      {connections.length > 0 ? (
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="text-3xl font-bold text-foreground tabular-nums">{total}</div>
            <p className="text-xs text-muted-foreground">{t('admin:dashboard.connectionsOverview.total')}</p>
          </div>
          <div className="space-y-2">
            {connections.map((conn: any) => (
              <div key={conn.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CONNECTION_STATUS_COLORS[conn.status] || '#6b7280' }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {statusLabels[conn.status] || conn.status}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">{conn.count}</span>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
              {connections.map((conn: any) => (
                <div
                  key={conn.status}
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(conn.count / total) * 100}%`,
                    backgroundColor: CONNECTION_STATUS_COLORS[conn.status] || '#6b7280',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Link2 className="h-8 w-8 mb-2 opacity-30" />
          <span className="text-sm">{t('admin:dashboard.connectionsOverview.empty')}</span>
        </div>
      )}
    </ChartCard>
  );
});

// --- Main Component ---

const AdminDashboard = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { formatCurrency } = useCurrency();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'dashboard', 'metrics'],
    queryFn: () => adminApi.getDashboardMetrics(getCurrentYear()),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // WebSocket real-time updates
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'metrics_updated' || message.type === 'metrics_refresh') {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    }
  }, [queryClient]);

  const { lastMessage } = useWebSocket(handleWebSocketMessage);

  useEffect(() => {
    if (lastMessage?.type === 'metrics_updated' || lastMessage?.type === 'metrics_refresh') {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    }
  }, [lastMessage, queryClient]);

  // KPI DnD
  const storageKey = `admin-dashboard-kpi-order-${authUser?.id ?? ""}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (parsed.length === ADMIN_KPI_IDS.length && ADMIN_KPI_IDS.every((id) => parsed.includes(id))) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return [...ADMIN_KPI_IDS];
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleKpiDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setKpiOrder((prev) => {
          const oldIndex = prev.indexOf(active.id as string);
          const newIndex = prev.indexOf(over.id as string);
          const next = arrayMove(prev, oldIndex, newIndex);
          localStorage.setItem(storageKey, JSON.stringify(next));
          return next;
        });
      }
    },
    [storageKey],
  );

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    refetch();
  }, [queryClient, refetch]);

  // KPI data
  const kpiData = data?.kpis ?? { activeUsers: 0, newUsers: 0, mrr: 0, churnRate: 0, usersGrowth: 0, newUsersGrowth: 0, mrrGrowth: 0, churnGrowth: 0 };

  const kpiMap = useMemo<Record<string, AdminKpiDef>>(() => ({
    "adm-users": {
      title: t('admin:dashboard.kpis.totalUsers'),
      value: kpiData.activeUsers.toLocaleString(),
      subtitle: t('admin:dashboard.kpis.registeredUsers'),
      growth: kpiData.usersGrowth,
      changeType: "positive",
      icon: Users,
      watermark: Users,
    },
    "adm-revenue": {
      title: t('admin:dashboard.kpis.monthlyRevenue'),
      value: formatCurrency(kpiData.mrr),
      subtitle: t('admin:dashboard.kpis.recurringRevenue'),
      growth: kpiData.mrrGrowth,
      changeType: "positive",
      icon: DollarSign,
      watermark: DollarSign,
    },
    "adm-churn": {
      title: t('admin:dashboard.kpis.churnRate'),
      value: `${kpiData.churnRate}%`,
      subtitle: t('common:vsPreviousMonth'),
      growth: kpiData.churnGrowth,
      growthSuffix: "pp",
      invertGrowthColor: true,
      changeType: kpiData.churnRate > 5 ? "negative" : "neutral",
      icon: Activity,
      watermark: Activity,
    },
    "adm-new-users": {
      title: t('admin:dashboard.kpis.newUsers'),
      value: kpiData.newUsers.toLocaleString(),
      subtitle: t('admin:dashboard.kpis.newUsersSubtitle'),
      growth: kpiData.newUsersGrowth,
      changeType: kpiData.newUsers > 0 ? "positive" : "neutral",
      icon: UserPlus,
      watermark: UserPlus,
    },
  }), [t, formatCurrency, kpiData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 min-w-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card h-[104px] animate-pulse">
              <div className="h-3 w-20 bg-muted-foreground/10 rounded mb-4" />
              <div className="h-7 w-24 bg-muted-foreground/10 rounded mb-2" />
              <div className="h-3 w-16 bg-muted-foreground/10 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[340px] rounded-xl bg-muted/20 animate-pulse" />
          <div className="h-[340px] rounded-xl bg-muted/20 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={`r1-${i}`} className="h-[300px] rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={`r2-${i}`} className="h-[300px] rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          {t('common:errorLoading')}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {(error as any)?.error || t('common:tryAgain')}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t('common:tryAgain')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiOrder.map((id) => {
              const kpi = kpiMap[id];
              return kpi ? <SortableAdminKpiCard key={id} id={id} kpi={kpi} /> : null;
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserGrowthChart t={t} />
        <RevenueChart t={t} />
      </div>

      {/* Row 3: Registrations, Role Distribution, Pending Approvals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RecentRegistrationsTable t={t} data={data} />
        <RoleDistributionChart t={t} data={data} />
        <PendingApprovalsCard t={t} data={data} />
      </div>

      {/* Row 4: Subscriptions, Notifications, Connections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SubscriptionStatsCard t={t} data={data} />
        <RecentNotificationsCard t={t} data={data} />
        <ConnectionsOverviewCard t={t} data={data} />
      </div>
    </div>
  );
};

export default AdminDashboard;
