import { Users, TrendingUp, CreditCard, AlertCircle, Activity } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
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
  const kpiData = {
    activeUsers: 1247,
    newUsers: 43,
    mrr: 87500,
    churnRate: 2.4,
  };

  const userGrowthData = [
    { month: "Ago", users: 1100 },
    { month: "Set", users: 1150 },
    { month: "Out", users: 1180 },
    { month: "Nov", users: 1200 },
    { month: "Dez", users: 1220 },
    { month: "Jan", users: 1240 },
    { month: "Fev", users: 1247 },
  ];

  const revenueData = [
    { month: "Ago", revenue: 82000 },
    { month: "Set", revenue: 84000 },
    { month: "Out", revenue: 85000 },
    { month: "Nov", revenue: 86000 },
    { month: "Dez", revenue: 87000 },
    { month: "Jan", revenue: 87200 },
    { month: "Fev", revenue: 87500 },
  ];

  const alerts = [
    { id: "1", type: "warning", message: "Falha na sincronização Puggy - 2 contas", time: "há 5 min" },
    { id: "2", type: "info", message: "Novo usuário Premium cadastrado", time: "há 15 min" },
    { id: "3", type: "error", message: "Erro na API B3 - Verificar logs", time: "há 1 hora" },
  ];

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

