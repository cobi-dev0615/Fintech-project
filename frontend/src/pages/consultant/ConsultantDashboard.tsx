import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Calendar, AlertCircle, GitBranch, ChevronRight } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import { Link } from "react-router-dom";
import { consultantApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";

const ConsultantDashboard = () => {
  const { t } = useTranslation(['consultant', 'common']);
  const { formatCurrency } = useCurrency();

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['consultant', 'dashboard', 'metrics'],
    queryFn: () => consultantApi.getDashboardMetrics(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });

  // Get stage label from translations
  const getStageLabel = (stage: string) => {
    return t(`consultant:stages.${stage}`, { defaultValue: stage });
  };

  // Get priority label from translations
  const getPriorityLabel = (priority: string) => {
    return t(`consultant:priority.${priority}`, { defaultValue: priority });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border-2 border-destructive/30 bg-card p-8 max-w-md mx-auto text-center">
        <AlertCircle className="h-12 w-12 text-destructive/80 mx-auto mb-4" />
        <p className="text-sm font-medium text-foreground mb-1">{t('consultant:dashboard.loadError')}</p>
        <p className="text-xs text-muted-foreground mb-4">{(error as any)?.error || t('consultant:dashboard.tryAgain')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t('common:tryAgain')}
        </Button>
      </div>
    );
  }

  const recentTasks = metrics?.recentTasks || [];
  const pipelineData = metrics?.pipeline || [];
  const totalProspects = pipelineData.reduce((sum: number, item: any) => sum + item.count, 0);

  return (
    <div className="space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('consultant:dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('consultant:dashboard.subtitle')}
          </p>
        </div>
      </div>

      {/* KPI Cards - 2×2 on mobile/tablet, 4 in a row on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border-2 border-blue-500/70 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200">
          <ProfessionalKpiCard
            title={t('consultant:dashboard.kpis.totalClients')}
            value={metrics?.kpis?.totalClients?.toString() || "0"}
            change={metrics?.kpis?.newClients > 0 ? t('consultant:dashboard.kpis.newThisMonth', { count: metrics.kpis.newClients }) : ""}
            changeType={metrics?.kpis?.newClients > 0 ? "positive" : "neutral"}
            icon={Users}
            iconClassName="text-blue-500"
            subtitle=""
          />
        </div>
        <div className="rounded-xl border-2 border-emerald-500/70 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-200">
          <ProfessionalKpiCard
            title={t('consultant:dashboard.kpis.totalNetWorth')}
            value={formatCurrency(metrics?.kpis?.totalNetWorth || 0)}
            change=""
            changeType="neutral"
            icon={TrendingUp}
            iconClassName="text-emerald-500"
            subtitle={t('consultant:dashboard.kpis.underManagement')}
          />
        </div>
        <div className="rounded-xl border-2 border-amber-500/70 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm hover:shadow-md hover:shadow-amber-500/5 transition-all duration-200">
          <ProfessionalKpiCard
            title={t('consultant:dashboard.kpis.pendingTasks')}
            value={metrics?.kpis?.pendingTasks?.toString() || "0"}
            change=""
            changeType="neutral"
            icon={Calendar}
            iconClassName="text-amber-500"
            subtitle={t('consultant:dashboard.kpis.forToday')}
          />
        </div>
        <div className="rounded-xl border-2 border-violet-500/70 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-all duration-200">
          <ProfessionalKpiCard
            title={t('consultant:dashboard.kpis.prospects')}
            value={metrics?.kpis?.prospects?.toString() || "0"}
            change=""
            changeType="neutral"
            icon={AlertCircle}
            iconClassName="text-violet-500"
            subtitle={t('consultant:dashboard.kpis.inPipeline')}
          />
        </div>
      </div>

      {/* Pipeline and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border-2 border-violet-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-shadow min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t('consultant:dashboard.pipeline.title')}</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{t('consultant:dashboard.pipeline.subtitle')}</p>
          {pipelineData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">{t('consultant:dashboard.pipeline.empty')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('consultant:dashboard.pipeline.emptyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pipelineData.map((stage: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {getStageLabel(stage.stage)}
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">{stage.count}</span>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-violet-500/80 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${totalProspects > 0 ? (stage.count / totalProspects) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-border">
            <Link
              to="/consultant/pipeline"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t('consultant:dashboard.pipeline.viewAll')}
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t('consultant:dashboard.tasks.title')}</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{t('consultant:dashboard.tasks.subtitle')}</p>
          {recentTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">{t('consultant:dashboard.tasks.empty')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('consultant:dashboard.tasks.emptyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.task}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.client} • {task.dueDate}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
                      task.priority === "high"
                        ? "bg-destructive/10 text-destructive"
                        : task.priority === "medium"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {getPriorityLabel(task.priority)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-border">
            <Link
              to="/consultant/tasks"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t('consultant:dashboard.tasks.viewAll')}
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultantDashboard;
