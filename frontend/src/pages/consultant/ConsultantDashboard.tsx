import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Calendar, AlertCircle, GitBranch, ChevronRight } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { DraggableDashboard } from "@/components/dashboard/DraggableDashboard";
import type { DashboardCard } from "@/types/dashboard";
import { Link } from "react-router-dom";
import { consultantApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";

const ConsultantDashboard = () => {
  const { t } = useTranslation(['consultant', 'common']);
  const { formatCurrency } = useCurrency();

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['consultant', 'dashboard', 'metrics'],
    queryFn: () => consultantApi.getDashboardMetrics(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const getStageLabel = (stage: string) => {
    return t(`consultant:stages.${stage}`, { defaultValue: stage });
  };

  const getPriorityLabel = (priority: string) => {
    return t(`consultant:priority.${priority}`, { defaultValue: priority });
  };

  const recentTasks = metrics?.recentTasks || [];
  const pipelineData = metrics?.pipeline || [];
  const totalProspects = pipelineData.reduce((sum: number, item: any) => sum + item.count, 0);

  const dashboardCards = useMemo((): DashboardCard[] => {
    const cards: DashboardCard[] = [
      {
        id: 'total-clients',
        type: 'kpi',
        order: 0,
        component: (
          <ProfessionalKpiCard
            title={t('consultant:dashboard.kpis.totalClients')}
            value={metrics?.kpis?.totalClients?.toString() || "0"}
            change={metrics?.kpis?.newClients > 0 ? t('consultant:dashboard.kpis.newThisMonth', { count: metrics.kpis.newClients }) : ""}
            changeType={metrics?.kpis?.newClients > 0 ? "positive" : "neutral"}
            icon={Users}
            accent="primary"
            subtitle=""
          />
        ),
        span: { mobile: 1, tablet: 1, desktop: 1 },
      },
      {
        id: 'total-net-worth',
        type: 'kpi',
        order: 1,
        component: (
          <ProfessionalKpiCard
            title={t('consultant:dashboard.kpis.totalNetWorth')}
            value={formatCurrency(metrics?.kpis?.totalNetWorth || 0)}
            change=""
            changeType="neutral"
            icon={TrendingUp}
            accent="success"
            subtitle={t('consultant:dashboard.kpis.underManagement')}
          />
        ),
        span: { mobile: 1, tablet: 1, desktop: 1 },
      },
      {
        id: 'pending-tasks',
        type: 'kpi',
        order: 2,
        component: (
          <ProfessionalKpiCard
            title={t('consultant:dashboard.kpis.pendingTasks')}
            value={metrics?.kpis?.pendingTasks?.toString() || "0"}
            change=""
            changeType="neutral"
            icon={Calendar}
            accent="warning"
            subtitle={t('consultant:dashboard.kpis.forToday')}
          />
        ),
        span: { mobile: 1, tablet: 1, desktop: 1 },
      },
      {
        id: 'prospects',
        type: 'kpi',
        order: 3,
        component: (
          <ProfessionalKpiCard
            title={t('consultant:dashboard.kpis.prospects')}
            value={metrics?.kpis?.prospects?.toString() || "0"}
            change=""
            changeType="neutral"
            icon={AlertCircle}
            accent="info"
            subtitle={t('consultant:dashboard.kpis.inPipeline')}
          />
        ),
        span: { mobile: 1, tablet: 1, desktop: 1 },
      },
    ];

    // Pipeline card
    cards.push({
      id: 'pipeline',
      type: 'chart',
      order: 10,
      draggable: false,
      component: (
        <ChartCard
          title={t('consultant:dashboard.pipeline.title')}
          subtitle={t('consultant:dashboard.pipeline.subtitle')}
          actions={
            <Link
              to="/consultant/pipeline"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t('consultant:dashboard.pipeline.viewAll')}
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          }
        >
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
                      className="bg-primary/80 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${totalProspects > 0 ? (stage.count / totalProspects) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      ),
      span: { mobile: 2, tablet: 2, desktop: 2 },
    });

    // Tasks card
    cards.push({
      id: 'tasks',
      type: 'chart',
      order: 11,
      draggable: false,
      component: (
        <ChartCard
          title={t('consultant:dashboard.tasks.title')}
          subtitle={t('consultant:dashboard.tasks.subtitle')}
          actions={
            <Link
              to="/consultant/tasks"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t('consultant:dashboard.tasks.viewAll')}
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          }
        >
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
        </ChartCard>
      ),
      span: { mobile: 2, tablet: 2, desktop: 2 },
    });

    return cards;
  }, [t, formatCurrency, metrics]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
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

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col gap-6">
        <DraggableDashboard
          dashboardType="consultant"
          defaultCards={dashboardCards}
        />
      </div>
    </div>
  );
};

export default ConsultantDashboard;
