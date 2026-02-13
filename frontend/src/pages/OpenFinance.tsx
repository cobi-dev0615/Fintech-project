import { useState, useEffect, useRef } from "react";
import { Link2, RefreshCw, Building2, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import { connectionsApi, financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Connection {
  id: string;
  name: string;
  type: "bank" | "b3";
  status: "connected" | "disconnected" | "error" | "expired" | "pending" | "needs_reauth" | "failed" | "revoked";
  lastSync?: string;
  institutionId?: string;
}

const OpenFinance = () => {
  const { t, i18n } = useTranslation(['connections', 'common']);
  const { formatCurrency } = useCurrency();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [expandedConnectionIds, setExpandedConnectionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      setError(null); // Clear any previous errors
      const [connectionsData, accountsData] = await Promise.all([
        connectionsApi.getAll().catch((err) => {
          console.error('Error fetching connections:', err);
          return { connections: [] };
        }),
        financeApi.getAccounts().catch(() => ({ accounts: [], grouped: [], total: 0 })),
      ]);
      if (abortController.signal.aborted) return;

      setAccounts(accountsData.accounts || []);

      // Map i18next language codes to Intl locale codes
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
      setConnections([]); // Set empty connections on error
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
  }, []); // Empty dependency array is intentional - only fetch on mount

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

  // Show loading only initially
  if (loading && connections.length === 0 && !error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">{t('connections:openFinance.loading')}</p>
        </div>
      </div>
    );
  }

  // Show error if loading failed
  if (error && connections.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('connections:openFinance.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('connections:openFinance.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={creating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${creating ? "animate-spin" : ""}`} />
            {creating ? t('connections:openFinance.syncing') : t('connections:openFinance.update')}
          </Button>
          <Button onClick={handlePluggyConnection} disabled={creating} size="default">
            <Link2 className="h-4 w-4 mr-2" />
            {creating ? t('connections:openFinance.connecting') : t('connections:openFinance.connect')}
          </Button>
        </div>
      </div>

      <ChartCard
        title={t('connections:openFinance.chartTitle')}
        subtitle={connections.length > 0 ? t('connections:openFinance.institutionCount', { count: connections.length }) : undefined}
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
