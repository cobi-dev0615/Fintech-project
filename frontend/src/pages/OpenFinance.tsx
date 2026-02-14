import { useState, useEffect, useRef } from "react";
import {
  Link2,
  RefreshCw,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Wallet,
  GripVertical,
  TrendingUp,
  TrendingDown,
  DollarSign,
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
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import { connectionsApi, financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";

interface Connection {
  id: string;
  name: string;
  type: "bank" | "b3";
  status: "connected" | "disconnected" | "error" | "expired" | "pending" | "needs_reauth" | "failed" | "revoked";
  lastSync?: string;
  institutionId?: string;
}

// --- KPI Card types & component ---

interface OFKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableOFKpiCard({ id, kpi }: { id: string; kpi: OFKpiDef }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
          {kpi.change && kpi.changeType !== "neutral" && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`flex items-center gap-0.5 ${
                  kpi.changeType === "positive"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {kpi.changeType === "positive" ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-semibold tabular-nums">
                  {kpi.change}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- KPI IDs ---

const OPENFINANCE_KPI_IDS = [
  "of-institutions",
  "of-accounts",
  "of-balance",
  "of-attention",
] as const;

const OpenFinance = () => {
  const { t, i18n } = useTranslation(['connections', 'common']);
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [expandedConnectionIds, setExpandedConnectionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- KPI drag order ---
  const kpiStorageKey = `openfinance-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === OPENFINANCE_KPI_IDS.length &&
          OPENFINANCE_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...OPENFINANCE_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  const toggleConnection = (id: string) => {
    setExpandedConnectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchConnections = async () => {
    if (fetchingRef.current) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    fetchingRef.current = true;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      setError(null);
      const [connectionsData, accountsData] = await Promise.all([
        connectionsApi.getAll().catch((err) => {
          console.error('Error fetching connections:', err);
          return { connections: [] };
        }),
        financeApi.getAccounts().catch(() => ({ accounts: [], grouped: [], total: 0 })),
      ]);
      if (abortController.signal.aborted) return;

      setAccounts(accountsData.accounts || []);

      const localeMap: Record<string, string> = {
        'pt-BR': 'pt-BR',
        'en': 'en-US',
        'pt': 'pt-BR',
      };
      const intlLocale = localeMap[i18n.language] || i18n.language;

      const mapped: Connection[] = connectionsData.connections.map((conn: any) => ({
        id: conn.id,
        name: conn.institution_name || conn.provider || t('connections:openFinance.institution'),
        type: conn.provider === "b3" ? "b3" : "bank",
        status:
          conn.status === "connected"
            ? "connected"
            : conn.status === "pending"
              ? "pending"
              : conn.status === "needs_reauth"
                ? "expired"
                : conn.status === "failed"
                  ? "error"
                  : conn.status === "revoked"
                    ? "disconnected"
                    : "disconnected",
        lastSync: conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString(intlLocale) : undefined,
        institutionId: conn.institution_id,
      }));
      setConnections(mapped);
      setError(null);
    } catch (err: any) {
      setAccounts([]);
      if (abortController.signal.aborted) return;
      const errorMessage = err?.error || err?.message || t('connections:openFinance.errorLoading');
      setError(errorMessage);
      console.error("Error fetching connections:", err);
      setConnections([]);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchConnections();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      fetchingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePluggyConnection = async () => {
    try {
      setCreating(true);
      const tokenResponse = await connectionsApi.getConnectToken();
      const token = tokenResponse?.connectToken;
      if (!token || typeof token !== "string") {
        throw new Error(t('connections:openFinance.invalidToken'));
      }

      if (typeof window !== "undefined" && (window as any).PluggyConnect) {
        const pluggyConnect = new (window as any).PluggyConnect({
          connectToken: token,
          includeSandbox: false,
          onSuccess: async (itemData: any) => {
            try {
              let itemId: string | null =
                itemData?.id ?? itemData?.itemId ?? itemData?.item?.id ?? itemData?.item?.itemId ?? (typeof itemData === "string" ? itemData : null);
              if (!itemId) throw new Error(t('connections:openFinance.itemIdError'));
              await connectionsApi.create({ itemId });
              toast({ title: t('common:success'), description: t('connections:openFinance.connectionCreated'), variant: "success" });
              await fetchConnections();
            } catch (err: any) {
              toast({ title: t('common:error'), description: err?.error || t('connections:openFinance.connectionError'), variant: "destructive" });
            } finally {
              setCreating(false);
            }
          },
          onError: () => {
            toast({ title: t('common:error'), description: t('connections:openFinance.connectError'), variant: "destructive" });
            setCreating(false);
          },
          onClose: () => setCreating(false),
        });
        pluggyConnect.init();
      } else {
        throw new Error(t('connections:openFinance.widgetError'));
      }
    } catch (err: any) {
      const msg = err?.error || err?.message || t('connections:openFinance.connectionErrorGeneric');
      toast({ title: t('common:error'), description: msg, variant: "destructive" });
      setCreating(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setCreating(true);
      await financeApi.sync();
      toast({ title: t('common:success'), description: t('connections:openFinance.syncSuccess'), variant: "success" });
      await fetchConnections();
    } catch (err: any) {
      toast({ title: t('common:error'), description: err?.error || t('connections:openFinance.syncError'), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // --- KPI computed values ---
  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const accountCount = accounts.length;
  const totalBalance = accounts.reduce(
    (sum, acc) => sum + parseFloat(acc.current_balance || 0),
    0
  );
  const attentionCount = connections.filter((c) =>
    ["expired", "error", "pending"].includes(c.status)
  ).length;

  const kpiData: Record<string, OFKpiDef> = {
    "of-institutions": {
      title: t("connections:openFinance.kpi.connectedInstitutions"),
      value: String(connectedCount),
      change: connectedCount > 0
        ? t("connections:openFinance.kpi.active", { count: connectedCount })
        : undefined,
      changeType: connectedCount > 0 ? "positive" : "neutral",
      icon: Building2,
      watermark: Building2,
    },
    "of-accounts": {
      title: t("connections:openFinance.kpi.syncedAccounts"),
      value: String(accountCount),
      change: accountCount > 0
        ? t("connections:openFinance.kpi.synced", { count: accountCount })
        : undefined,
      changeType: accountCount > 0 ? "positive" : "neutral",
      icon: Wallet,
      watermark: Wallet,
    },
    "of-balance": {
      title: t("connections:openFinance.kpi.totalBalance"),
      value: formatCurrency(totalBalance),
      change: totalBalance !== 0
        ? t("connections:openFinance.kpi.allAccounts")
        : undefined,
      changeType: totalBalance > 0 ? "positive" : totalBalance < 0 ? "negative" : "neutral",
      icon: DollarSign,
      watermark: DollarSign,
    },
    "of-attention": {
      title: t("connections:openFinance.kpi.needsAttention"),
      value: String(attentionCount),
      change: attentionCount > 0
        ? t("connections:openFinance.kpi.requireAction", { count: attentionCount })
        : undefined,
      changeType: attentionCount > 0 ? "negative" : "neutral",
      icon: AlertCircle,
      watermark: AlertCircle,
    },
  };

  // --- KPI grid JSX (reused in loading/error states) ---
  const kpiGrid = (
    <DndContext
      sensors={kpiSensors}
      collisionDetection={closestCenter}
      onDragEnd={handleKpiDragEnd}
    >
      <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiOrder.map((id) => {
            const kpi = kpiData[id];
            if (!kpi) return null;
            return <SortableOFKpiCard key={id} id={id} kpi={kpi} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

  // Show loading only initially
  if (loading && connections.length === 0 && !error) {
    return (
      <div className="space-y-6 min-w-0">
        {kpiGrid}
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">{t('connections:openFinance.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if loading failed
  if (error && connections.length === 0) {
    return (
      <div className="space-y-6 min-w-0">
        {kpiGrid}
        <div className="flex justify-center items-center h-64">
          <div className="text-center space-y-3">
            <p className="text-destructive">{error}</p>
            <button
              onClick={() => fetchConnections()}
              className="text-sm text-primary hover:underline"
            >
              {t('connections:openFinance.tryAgain', { defaultValue: 'Try again' })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      {kpiGrid}

      {/* Connected Institutions */}
      <ChartCard
        title={t('connections:openFinance.chartTitle')}
        subtitle={connections.length > 0 ? t('connections:openFinance.institutionCount', { count: connections.length }) : undefined}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={creating}>
              <RefreshCw className={`h-4 w-4 mr-2 ${creating ? "animate-spin" : ""}`} />
              {creating ? t('connections:openFinance.syncing') : t('connections:openFinance.update')}
            </Button>
            <Button onClick={handlePluggyConnection} disabled={creating} size="sm">
              <Link2 className="h-4 w-4 mr-2" />
              {creating ? t('connections:openFinance.connecting') : t('connections:openFinance.connect')}
            </Button>
          </>
        }
      >
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted/50 p-5 mb-4">
              <Building2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">{t('connections:openFinance.noInstitutions')}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {t('connections:openFinance.noInstitutionsDesc')}
            </p>
            <Button onClick={handlePluggyConnection} disabled={creating} className="mt-5">
              <Link2 className="h-4 w-4 mr-2" />
              {t('connections:openFinance.connectInstitution')}
            </Button>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1 assets-scrollbar">
            {connections.map((conn) => {
              const isExpanded = expandedConnectionIds.has(conn.id);
              const connectionAccounts = accounts.filter(
                (a: any) =>
                  (a.institution_name || "").toLowerCase() === (conn.name || "").toLowerCase() ||
                  (a.institution_name || a.name || "").toLowerCase().includes((conn.name || "").toLowerCase())
              );
              return (
                <li key={conn.id} className="rounded-xl border border-border overflow-hidden bg-card/50">
                  <button
                    type="button"
                    onClick={() => toggleConnection(conn.id)}
                    className="flex items-center justify-between gap-3 w-full p-4 text-left hover:bg-muted/20 transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{conn.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {conn.type === "b3" ? t('connections:openFinance.broker') : t('connections:openFinance.bank')}
                          {conn.lastSync && ` • ${t('connections:openFinance.lastSync', { date: conn.lastSync })}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {conn.status === "connected" && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          {t('connections:openFinance.status.connected')}
                        </span>
                      )}
                      {conn.status === "pending" && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="h-4 w-4" />
                          {t('connections:openFinance.status.pending')}
                        </span>
                      )}
                      {(conn.status === "expired" || conn.status === "error" || conn.status === "failed") && (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          {t(`connections:openFinance.status.${conn.status}`)}
                        </span>
                      )}
                      {(conn.status === "disconnected" || conn.status === "revoked") && (
                        <span className="text-xs text-muted-foreground">{t(`connections:openFinance.status.${conn.status}`)}</span>
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/10">
                      {connectionAccounts.length === 0 ? (
                        <div className="px-4 py-3 pl-14 text-sm text-muted-foreground">
                          {t('connections:openFinance.noAccountsSynced')}
                        </div>
                      ) : (
                        <ul className="py-2">
                          {connectionAccounts.map((acc: any) => (
                            <li
                              key={acc.id || acc.pluggy_account_id}
                              className="flex items-center justify-between gap-2 px-4 py-2.5 pl-14 hover:bg-muted/10 min-w-0"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm truncate text-foreground">{acc.name || t('connections:openFinance.account')}</span>
                              </div>
                              <span className="text-sm font-medium tabular-nums shrink-0">
                                {formatCurrency(parseFloat(acc.current_balance || 0))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ChartCard>
    </div>
  );
};

export default OpenFinance;
