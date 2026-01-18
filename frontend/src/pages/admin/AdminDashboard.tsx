import { useState, useEffect, useMemo, useCallback } from "react";
import { Users, TrendingUp, CreditCard, AlertCircle, Activity } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
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
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    activeUsers: 0,
    newUsers: 0,
    mrr: 0,
    churnRate: 0,
  });
  const [userGrowthData, setUserGrowthData] = useState<Array<{ month: string; users: number }>>([]);
  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number }>>([]);
  const [alerts, setAlerts] = useState<Array<{ id: string; type: string; message: string; time: string }>>([]);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDashboardMetrics();
      
      setKpiData(data.kpis);
      setUserGrowthData(data.userGrowth);
      setRevenueData(data.revenue);
      setAlerts(data.alerts.map(alert => ({
        ...alert,
        time: new Date(alert.time).toLocaleString('pt-BR'),
      })));
    } catch (error: any) {
      console.error('Failed to fetch metrics:', error);
      // Fallback to empty data on error
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket connection for real-time updates
  const webSocketUrl = useMemo(() => {
    // Use same logic as API base URL to determine backend URL
    const origin = window.location.origin;
    
    // If accessing from localhost, use localhost for WebSocket
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'ws://localhost:5000/ws';
    }
    
    // If accessing from public IP, use same IP for WebSocket with backend port
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      const protocol = origin.startsWith('https') ? 'wss' : 'ws';
      return `${protocol}://${hostname}:5000/ws`;
    } catch {
      // Fallback to localhost
      return 'ws://localhost:5000/ws';
    }
  }, []); // Only calculate once

  const handleWebSocketMessage = useCallback((message: any) => {
    // Refresh metrics when receiving update notification
    if (message.type === 'metrics_updated' || message.type === 'metrics_refresh') {
      fetchMetrics();
    }
  }, [fetchMetrics]);

  const { connected, lastMessage } = useWebSocket(webSocketUrl, handleWebSocketMessage);

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Refresh when WebSocket receives update
  useEffect(() => {
    if (lastMessage && (lastMessage.type === 'metrics_updated' || lastMessage.type === 'metrics_refresh')) {
      fetchMetrics();
    }
  }, [lastMessage]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando métricas...</p>
        </div>
      </div>
    );
  }

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
          value={alerts.length.toString()}
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
          </div>
        </ChartCard>

        <ChartCard
          title="Receita Recorrente Mensal"
          subtitle="MRR (R$)"
        >
          <div className="h-64">
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
          </div>
        </ChartCard>
      </div>

      {/* Alerts Panel */}
      <ChartCard title="Alertas do Sistema" subtitle="Requerem atenção">
        <div className="space-y-3">
          {alerts.map((alert) => (
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
          ))}
        </div>
      </ChartCard>
    </div>
  );
};

export default AdminDashboard;

