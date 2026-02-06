import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Activity, AlertCircle } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";

interface Integration {
  id: string;
  name: string;
  provider: string;
  status: "healthy" | "degraded" | "down";
  lastSync: string;
  uptime: string;
  errorRate: number;
  requestsToday: number;
}

const IntegrationsMonitor = () => {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState({
    healthy: 0,
    degraded: 0,
    down: 0,
    total: 0,
    avgUptime: "99.9%",
  });
  const [logs, setLogs] = useState<Array<{
    time: string;
    integration: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  }>>([]);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getIntegrations();
      setIntegrations(data.integrations);
      setStats(data.stats);
      setLogs(data.logs);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando integrações...</p>
        </div>
      </div>
    );
  }

  const healthyCount = stats.healthy;
  const degradedCount = stats.degraded;
  const downCount = stats.down;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "degraded":
        return <Clock className="h-5 w-5 text-warning" />;
      case "down":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      healthy: "bg-success/10 text-success",
      degraded: "bg-warning/10 text-warning",
      down: "bg-destructive/10 text-destructive",
    };
    const labels = {
      healthy: "Operacional",
      degraded: "Degradado",
      down: "Fora do Ar",
    };
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoramento de Integrações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Status e saúde das APIs externas
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Integrações Operacionais"
          value={healthyCount.toString()}
          change={`de ${integrations.length} total`}
          changeType="neutral"
          icon={CheckCircle2}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Status Degradado"
          value={degradedCount.toString()}
          change="requer atenção"
          changeType="negative"
          icon={Clock}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Fora do Ar"
          value={downCount.toString()}
          change=""
          changeType="neutral"
          icon={XCircle}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Uptime Médio"
          value={stats.avgUptime}
          change="últimos 15 dias"
          changeType="positive"
          icon={Activity}
          subtitle=""
        />
      </div>

      {/* Integrations Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <ChartCard key={integration.id} className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(integration.status)}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{integration.provider}</p>
                  </div>
                </div>
                {getStatusBadge(integration.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Última Sincronização</p>
                  <p className="text-sm font-medium text-foreground">{integration.lastSync}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Uptime</p>
                  <p className="text-sm font-medium text-foreground">{integration.uptime}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Taxa de Erro</p>
                  <p className={`text-sm font-medium ${
                    integration.errorRate < 1 ? "text-success" : integration.errorRate < 5 ? "text-warning" : "text-destructive"
                  }`}>
                    {integration.errorRate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Requisições Hoje</p>
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    {integration.requestsToday.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              {integration.status !== "healthy" && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-warning">Alerta</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {integration.status === "degraded"
                          ? "Performance abaixo do esperado. Verificar logs."
                          : "Integração fora do ar. Ação necessária."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ChartCard>
        ))}
      </div>

      {/* Logs Table */}
      <ChartCard title="Logs Recentes">
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum log recente</p>
          ) : (
            logs.map((log, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    log.type === "success" ? "bg-success" : "bg-warning"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{log.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.integration} • {log.time}
                  </p>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default IntegrationsMonitor;

