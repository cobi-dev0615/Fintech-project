import { CheckCircle2, XCircle, Clock, Activity, AlertCircle } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/badge";

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
  const integrations: Integration[] = [
    {
      id: "1",
      name: "Open Finance",
      provider: "Puggy",
      status: "healthy",
      lastSync: "há 2 minutos",
      uptime: "99.9%",
      errorRate: 0.1,
      requestsToday: 1247,
    },
    {
      id: "2",
      name: "B3 API",
      provider: "B3",
      status: "healthy",
      lastSync: "há 5 minutos",
      uptime: "99.8%",
      errorRate: 0.2,
      requestsToday: 892,
    },
    {
      id: "3",
      name: "Pagamentos",
      provider: "Mercado Pago",
      status: "healthy",
      lastSync: "há 1 minuto",
      uptime: "100%",
      errorRate: 0,
      requestsToday: 456,
    },
    {
      id: "4",
      name: "Emails",
      provider: "Resend",
      status: "degraded",
      lastSync: "há 15 minutos",
      uptime: "98.5%",
      errorRate: 1.5,
      requestsToday: 2341,
    },
    {
      id: "5",
      name: "Cotações",
      provider: "BRAPI",
      status: "healthy",
      lastSync: "há 30 segundos",
      uptime: "99.7%",
      errorRate: 0.3,
      requestsToday: 5678,
    },
  ];

  const healthyCount = integrations.filter((int) => int.status === "healthy").length;
  const degradedCount = integrations.filter((int) => int.status === "degraded").length;
  const downCount = integrations.filter((int) => int.status === "down").length;

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
          changeType="warning"
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
          value="99.6%"
          change="últimos 30 dias"
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
          {[
            { time: "há 5 min", integration: "Puggy", message: "Sync concluído - 1247 contas", type: "success" },
            { time: "há 15 min", integration: "Resend", message: "Erro ao enviar email - Retry em 5min", type: "warning" },
            { time: "há 30 min", integration: "B3 API", message: "Sync concluído - 892 posições", type: "success" },
          ].map((log, index) => (
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
          ))}
        </div>
      </ChartCard>
    </div>
  );
};

export default IntegrationsMonitor;

