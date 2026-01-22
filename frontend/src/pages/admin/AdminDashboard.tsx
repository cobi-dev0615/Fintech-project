import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect, useCallback, useState, memo } from "react";
import { Users, TrendingUp, AlertCircle, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Skeleton } from "@/components/ui/skeleton";
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
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const getCurrentYear = () => new Date().getFullYear();
const getYearOptions = () => {
  const y = getCurrentYear();
  return [y, y - 1, y - 2, y - 3, y - 4];
};

/** Isolated chart – year change only refetches this chart; parent page does not re-render. */
const UserGrowthChart = memo(function UserGrowthChart() {
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
    return MONTH_NAMES.map((month, i) => ({ month, users: map.get(month) ?? 0, monthNum: i + 1 }));
  }, [data?.userGrowth]);

  return (
    <ChartCard
      title="Crescimento de Usuários"
      subtitle="Evolução mensal"
      actions={
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {getYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar gráfico</TooltipContent>
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
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados disponíveis</div>
        )}
      </div>
    </ChartCard>
  );
});

/** Isolated chart – year change only refetches this chart; parent page does not re-render. */
const RevenueChart = memo(function RevenueChart() {
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
    return MONTH_NAMES.map((month, i) => ({ month, revenue: map.get(month) ?? 0, monthNum: i + 1 }));
  }, [data?.revenue]);

  return (
    <ChartCard
      title="Receita Recorrente Mensal"
      subtitle="MRR (R$)"
      actions={
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {getYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar gráfico</TooltipContent>
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
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} width={50} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados disponíveis</div>
        )}
      </div>
    </ChartCard>
  );
});

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'dashboard', 'metrics'],
    queryFn: () => adminApi.getDashboardMetrics(getCurrentYear()),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

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

  const formattedAlerts = useMemo(() => {
    if (!data?.alerts) return [];
    return data.alerts.map((alert: { id: string; type: string; message: string; time: string }) => ({
      ...alert,
      time: new Date(alert.time).toLocaleString('pt-BR'),
    }));
  }, [data?.alerts]);

  const kpiData = data?.kpis ?? { activeUsers: 0, newUsers: 0, mrr: 0, churnRate: 0 };

  const handleRefresh = useCallback(() => {
    // Invalidate all dashboard queries (main metrics, user growth, and revenue charts)
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    // Refetch the main metrics
    refetch();
    // The chart components will automatically refetch when their queries are invalidated
  }, [queryClient, refetch]);

  // Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{(error as any)?.error || "Erro ao carregar métricas"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral da plataforma e métricas
          </p>
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isFetching} className="h-9 w-9 shrink-0 md:ml-auto">
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Atualizar painel</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Usuários Ativos"
          value={kpiData.activeUsers.toLocaleString("pt-BR")}
          change={`+${kpiData.newUsers} este mês`}
          changeType="positive"
          icon={Users}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Receita Recorrente (MRR)"
          value={`R$ ${kpiData.mrr.toLocaleString("pt-BR")}`}
          change="+2,1%"
          changeType="positive"
          icon={TrendingUp}
          subtitle="mensal"
        />
        <ProfessionalKpiCard
          title="Taxa de Churn"
          value={`${kpiData.churnRate}%`}
          change="vs mês anterior"
          changeType="neutral"
          icon={Activity}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Alertas Ativos"
          value={formattedAlerts.length.toString()}
          change="requerem atenção"
          changeType="warning"
          icon={AlertCircle}
          subtitle=""
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserGrowthChart />
        <RevenueChart />
      </div>

      <ChartCard title="Alertas do Sistema" subtitle="Requerem atenção">
        <div className="space-y-3">
          {formattedAlerts.length > 0 ? (
            formattedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                alert.type === "error"
                  ? "bg-destructive/10 border-destructive/20"
                  : alert.type === "warning"
                  ? "bg-warning/10 border-warning/20"
                  : "bg-muted border-border"
              }`}
            >
              <AlertCircle
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  alert.type === "error"
                    ? "text-destructive"
                    : alert.type === "warning"
                    ? "text-warning"
                    : "text-muted-foreground"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
              </div>
            </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum alerta no momento
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default AdminDashboard;

