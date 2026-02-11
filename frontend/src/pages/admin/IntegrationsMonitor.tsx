import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Activity, AlertCircle } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation(['admin', 'common']);
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
    type: "success" | "warning" | "error";
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
      console.error("Failed to fetch integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t('admin:integrations.loading')}</p>
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
    const getStatusLabel = (s: string) => {
      if (s === 'healthy') return t('admin:integrations.status.healthy');
      if (s === 'degraded') return t('admin:integrations.status.degraded');
      if (s === 'down') return t('admin:integrations.status.down');
      return s;
    };
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin:integrations.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin:integrations.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title={t('admin:integrations.kpis.operational')}
          value={healthyCount.toString()}
          change={t('admin:integrations.kpis.ofTotal', { total: integrations.length })}
          changeType="neutral"
          icon={CheckCircle2}
          subtitle=""
        />
        <ProfessionalKpiCard
          title={t('admin:integrations.kpis.degraded')}
          value={degradedCount.toString()}
          change={t('admin:integrations.kpis.requiresAttention')}
          changeType="negative"
          icon={Clock}
          subtitle=""
        />
        <ProfessionalKpiCard
          title={t('admin:integrations.kpis.down')}
          value={downCount.toString()}
          change=""
          changeType="neutral"
          icon={XCircle}
          subtitle=""
        />
        <ProfessionalKpiCard
          title={t('admin:integrations.kpis.avgUptime')}
          value={stats.avgUptime}
          change={t('admin:integrations.kpis.last15Days')}
          changeType="positive"
          icon={Activity}
          subtitle=""
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={t('admin:integrations.integrationsCard.title')} subtitle={t('admin:integrations.integrationsCard.subtitle')}>
          <div className="space-y-2">
            {integrations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t('admin:integrations.integrationsCard.empty')}
              </p>
            ) : (
              integrations.map((int) => (
                <div
                  key={int.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(int.status)}
                    <div>
                      <p className="font-medium text-foreground">{int.name}</p>
                      <p className="text-xs text-muted-foreground">{int.provider}</p>
                    </div>
                  </div>
                  {getStatusBadge(int.status)}
                </div>
              ))
            )}
          </div>
        </ChartCard>

        <ChartCard title={t('admin:integrations.logsCard.title')} subtitle={t('admin:integrations.logsCard.subtitle')}>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t('admin:integrations.logsCard.empty')}
              </p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-md text-sm border border-border/50"
                >
                  {log.type === "error" && <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                  {log.type === "warning" && <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />}
                  {log.type === "success" && <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <span className="text-muted-foreground text-xs">{log.time}</span>
                    <p className="text-foreground truncate">{log.message}</p>
                    <p className="text-xs text-muted-foreground">{log.integration}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default IntegrationsMonitor;
