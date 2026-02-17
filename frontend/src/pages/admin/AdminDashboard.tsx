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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
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
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={50} />
              <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
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
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v)} width={70} />
              <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
    </div>
  );
};

export default AdminDashboard;
