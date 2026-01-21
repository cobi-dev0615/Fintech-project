import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect, useCallback } from "react";
import { Users, TrendingUp, AlertCircle, Activity } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Skeleton } from "@/components/ui/skeleton";
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

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  // Fetch metrics with React Query for caching and better performance
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard', 'metrics'],
    queryFn: () => adminApi.getDashboardMetrics(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for faster failure
  });

  // WebSocket connection for real-time updates - uses singleton connection from context
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'metrics_updated' || message.type === 'metrics_refresh') {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'metrics'] });
    }
  }, [queryClient]);

  // Subscribe to WebSocket messages - connection is maintained at app level
  const { lastMessage } = useWebSocket(handleWebSocketMessage);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage && (lastMessage.type === 'metrics_updated' || lastMessage.type === 'metrics_refresh')) {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'metrics'] });
    }
  }, [lastMessage, queryClient]);

  // Format alerts with localized time
  const formattedAlerts = useMemo(() => {
    if (!data?.alerts) return [];
    return data.alerts.map(alert => ({
      ...alert,
      time: new Date(alert.time).toLocaleString('pt-BR'),
    }));
  }, [data?.alerts]);

  // Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Page Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>

        {/* Alerts Skeleton */}
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

  const kpiData = data?.kpis || {
    activeUsers: 0,
    newUsers: 0,
    mrr: 0,
    churnRate: 0,
  };
  const userGrowthData = data?.userGrowth || [];
  const revenueData = data?.revenue || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral da plataforma e métricas
          </p>
        </div>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Crescimento de Usuários"
          subtitle="Evolução mensal"
        >
          <div className="h-64">
            {userGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userGrowthData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Receita Recorrente Mensal"
          subtitle="MRR (R$)"
        >
          <div className="h-64">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Alerts Panel */}
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

