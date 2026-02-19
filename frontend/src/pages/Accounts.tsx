import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  RefreshCw,
  Building2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  TrendingUp,
  TrendingDown,
  CreditCard,
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
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";

// --- KPI Card types & component ---

interface AccKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableAccKpiCard({ id, kpi }: { id: string; kpi: AccKpiDef }) {
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

const ACCOUNTS_KPI_IDS = [
  "acc-balance",
  "acc-count",
  "acc-banks",
  "acc-average",
] as const;

const Accounts = () => {
  const { t } = useTranslation(['accounts', 'common']);
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());

  // --- KPI drag order ---
  const kpiStorageKey = `accounts-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === ACCOUNTS_KPI_IDS.length &&
          ACCOUNTS_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...ACCOUNTS_KPI_IDS];
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

  const accountsByBank = useMemo(() => {
    const map = new Map<string, { accounts: any[]; total: number }>();
    accounts.forEach((acc: any) => {
      const bank = acc.institution_name || t('common:others');
      if (!map.has(bank)) map.set(bank, { accounts: [], total: 0 });
      const entry = map.get(bank)!;
      entry.accounts.push(acc);
      entry.total += parseFloat(acc.current_balance || 0);
    });
    return Array.from(map.entries()).map(([name, { accounts: list, total }]) => ({ name, accounts: list, total }));
  }, [accounts]);

  const toggleBank = (bankName: string) => {
    setExpandedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(bankName)) next.delete(bankName);
      else next.add(bankName);
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const accountsData = await financeApi
        .getAccounts()
        .catch(() => ({ accounts: [], grouped: [], total: 0 }));

      setAccounts(accountsData.accounts || []);
      setTotalBalance(typeof accountsData.total === "number" ? accountsData.total : 0);
      setError(null);
    } catch (err: any) {
      setError(err?.error || t('accounts:errorLoading'));
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchData();
      toast({
        title: t('common:syncComplete'),
        description: t('accounts:syncSuccess'),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t('common:syncError'),
        description: t('common:syncErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // --- KPI computed values ---
  const accountCount = accounts.length;
  const bankCount = accountsByBank.length;
  const avgBalance = accountCount > 0 ? totalBalance / accountCount : 0;

  const kpiData: Record<string, AccKpiDef> = {
    "acc-balance": {
      title: t("accounts:kpi.totalBalance"),
      value: formatCurrency(totalBalance),
      change: totalBalance !== 0
        ? t("accounts:kpi.allAccounts")
        : undefined,
      changeType: totalBalance > 0 ? "positive" : totalBalance < 0 ? "negative" : "neutral",
      icon: Wallet,
      watermark: Wallet,
    },
    "acc-count": {
      title: t("accounts:kpi.totalAccounts"),
      value: String(accountCount),
      change: accountCount > 0
        ? t("accounts:kpi.synced", { count: accountCount })
        : undefined,
      changeType: accountCount > 0 ? "positive" : "neutral",
      icon: CreditCard,
      watermark: CreditCard,
    },
    "acc-banks": {
      title: t("accounts:kpi.institutions"),
      value: String(bankCount),
      change: bankCount > 0
        ? t("accounts:kpi.connected", { count: bankCount })
        : undefined,
      changeType: bankCount > 0 ? "positive" : "neutral",
      icon: Building2,
      watermark: Building2,
    },
    "acc-average": {
      title: t("accounts:kpi.avgBalance"),
      value: formatCurrency(avgBalance),
      change: avgBalance !== 0
        ? t("accounts:kpi.perAccount")
        : undefined,
      changeType: avgBalance > 0 ? "positive" : avgBalance < 0 ? "negative" : "neutral",
      icon: TrendingUp,
      watermark: TrendingUp,
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
            return <SortableAccKpiCard key={id} id={id} kpi={kpi} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

  // Show loading only initially
  if (loading) {
    return (
      <div className="space-y-6 min-w-0">
        {kpiGrid}
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if loading failed
  if (error) {
    return (
      <div className="space-y-6 min-w-0">
        {kpiGrid}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      {kpiGrid}

      {/* Accounts List */}
      <ChartCard
        title={t('accounts:chartTitle')}
        subtitle={accounts.length > 0 ? t('common:accountCount', { count: accounts.length }) : undefined}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? t('common:syncing') : t('common:sync')}
          </Button>
        }
      >
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted/50 p-5 mb-4">
              <Building2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">{t('accounts:noAccounts')}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {t('accounts:noAccountsDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 assets-scrollbar">
            {accountsByBank.map(({ name: bankName, accounts: bankAccounts, total: bankTotal }) => {
              const isExpanded = expandedBanks.has(bankName);
              return (
                <div key={bankName} className="rounded-xl border border-border overflow-hidden bg-card/50">
                  <button
                    type="button"
                    onClick={() => toggleBank(bankName)}
                    className="flex items-center justify-between gap-3 w-full p-4 text-left hover:bg-muted/20 transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{bankName}</p>
                        <p className="text-xs text-muted-foreground">{t('common:accountCount', { count: bankAccounts.length })}</p>
                      </div>
                    </div>
                    <p className="font-semibold tabular-nums shrink-0">
                      {formatCurrency(bankTotal)}
                    </p>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/10">
                      {bankAccounts.map((acc: any) => (
                        <div
                          key={acc.id || acc.pluggy_account_id}
                          className="flex items-center justify-between gap-2 px-4 py-2.5 pl-14 hover:bg-muted/10 min-w-0"
                        >
                          <span className="text-sm truncate text-foreground">
                            {acc.name || acc.type || t('common:account')}
                          </span>
                          <span className="text-sm font-medium tabular-nums shrink-0">
                            {formatCurrency(parseFloat(acc.current_balance || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default Accounts;
