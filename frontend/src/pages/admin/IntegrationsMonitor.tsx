import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  AlertCircle,
  GripVertical,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ChartCard from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

// --- Types ---

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

interface IntKpiDef {
  title: string;
  value: string;
  subtitle?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableIntKpiCard({ id, kpi }: { id: string; kpi: IntKpiDef }) {
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
          {kpi.subtitle && (
            <span className="text-xs text-muted-foreground">{kpi.subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Constants ---

const INT_KPI_IDS = ["int-operational", "int-degraded", "int-down", "int-uptime"] as const;

// --- Component ---

const IntegrationsMonitor = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { user: authUser } = useAuth();
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

  // --- KPI DnD ---

  const kpiStorageKey = `admin-integrations-kpi-order-${authUser?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === INT_KPI_IDS.length &&
          INT_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...INT_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleKpiDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setKpiOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, moved);
      localStorage.setItem(kpiStorageKey, JSON.stringify(next));
      return next;
    });
  };

  // --- Data fetching ---

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

  // --- KPI Computation ---

  const kpiData = useMemo(() => ({
    "int-operational": {
      title: t('admin:integrations.kpis.operational'),
      value: String(stats.healthy),
      subtitle: t('admin:integrations.kpis.ofTotal', { total: stats.total }),
      changeType: "positive" as const,
      icon: CheckCircle2,
      watermark: CheckCircle2,
    },
    "int-degraded": {
      title: t('admin:integrations.kpis.degraded'),
      value: String(stats.degraded),
      subtitle: t('admin:integrations.kpis.requiresAttention'),
      changeType: "negative" as const,
      icon: Clock,
      watermark: Clock,
    },
    "int-down": {
      title: t('admin:integrations.kpis.down'),
      value: String(stats.down),
      changeType: "neutral" as const,
      icon: XCircle,
      watermark: XCircle,
    },
    "int-uptime": {
      title: t('admin:integrations.kpis.avgUptime'),
      value: stats.avgUptime,
      subtitle: t('admin:integrations.kpis.last15Days'),
      changeType: "positive" as const,
      icon: Activity,
      watermark: Activity,
    },
  }), [stats, t]);

  // --- Helpers ---

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
      if (s === 'healthy') return t('admin:integrations.status.operational');
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
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[100px] sm:h-[108px] rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
          <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpiOrder.map((id) => (
                <SortableIntKpiCard key={id} id={id} kpi={kpiData[id as keyof typeof kpiData]} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title={t('admin:integrations.integrationsCard.title')}
          subtitle={t('admin:integrations.integrationsCard.subtitle')}
        >
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : integrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Activity className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {t('admin:integrations.integrationsCard.empty')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {integrations.map((int) => (
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
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t('admin:integrations.logsCard.title')}
          subtitle={t('admin:integrations.logsCard.subtitle')}
        >
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-md bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {t('admin:integrations.logsCard.empty')}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {logs.map((log, i) => (
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
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default IntegrationsMonitor;
