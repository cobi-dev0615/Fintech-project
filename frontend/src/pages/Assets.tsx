import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  RefreshCw,
  Building2,
  ChevronDown,
  ChevronRight,
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
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import ChartCard from "@/components/dashboard/ChartCard";
import { financeApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Label,
} from "recharts";

// --- KPI Card types & component ---

interface AssetKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableAssetKpiCard({ id, kpi }: { id: string; kpi: AssetKpiDef }) {
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

const ASSET_KPI_IDS = [
  "asset-networth",
  "asset-available",
  "asset-invested",
  "asset-carddebt",
] as const;

const Assets = () => {
  const { t } = useTranslation(["accounts", "common"]);
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());
  const [data, setData] = useState<{
    totalBalance: number;
    totalInvestments: number;
    totalCardDebt: number;
    accounts: any[];
    investments: any[];
    cards: any[];
    breakdown: any[];
  }>({
    totalBalance: 0,
    totalInvestments: 0,
    totalCardDebt: 0,
    accounts: [],
    investments: [],
    cards: [],
    breakdown: [],
  });

  // --- KPI drag order ---
  const kpiStorageKey = `assets-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === ASSET_KPI_IDS.length &&
          ASSET_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...ASSET_KPI_IDS];
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

  // --- Data fetching ---

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accountsData, investmentsData, cardsData] = await Promise.all([
        financeApi
          .getAccounts()
          .catch(() => ({ accounts: [], grouped: [], total: 0 })),
        financeApi
          .getInvestments()
          .catch(() => ({ investments: [], total: 0, breakdown: [] })),
        financeApi.getCards().catch(() => ({ cards: [] })),
      ]);

      const totalBalance =
        typeof accountsData.total === "number" ? accountsData.total : 0;
      const totalInvestments =
        typeof investmentsData.total === "number"
          ? investmentsData.total
          : 0;
      const totalCardDebt = (cardsData.cards || []).reduce(
        (sum: number, card: any) => sum + parseFloat(card.balance || 0),
        0
      );

      setData({
        totalBalance,
        totalInvestments,
        totalCardDebt,
        accounts: accountsData.accounts || [],
        investments: investmentsData.investments || [],
        cards: cardsData.cards || [],
        breakdown: investmentsData.breakdown || [],
      });
    } catch (error) {
      console.error("Failed to fetch assets data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchData();
      toast({
        title: t("common:syncComplete"),
        description: t("accounts:assets.syncSuccess"),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t("common:syncError"),
        description: err?.error || t("common:syncErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // --- Computed values ---

  const netWorth =
    data.totalBalance + data.totalInvestments - data.totalCardDebt;

  const accountsByBank = useMemo(() => {
    const map = new Map<string, { accounts: any[]; total: number }>();
    (data.accounts || []).forEach((acc: any) => {
      const bank = acc.institution_name || t("common:others");
      if (!map.has(bank)) map.set(bank, { accounts: [], total: 0 });
      const entry = map.get(bank)!;
      entry.accounts.push(acc);
      entry.total += parseFloat(acc.current_balance || 0);
    });
    return Array.from(map.entries()).map(([name, { accounts, total }]) => ({
      name,
      accounts,
      total,
    }));
  }, [data.accounts, t]);

  const toggleBank = (bankName: string) => {
    setExpandedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(bankName)) next.delete(bankName);
      else next.add(bankName);
      return next;
    });
  };

  const allocationData = [
    {
      name: t("assets.liquidityAccounts"),
      value: data.totalBalance,
      color: "#3b82f6",
    },
    {
      name: t("assets.investmentsLabel"),
      value: data.totalInvestments,
      color: "#10b981",
    },
    ...(data.totalCardDebt > 0
      ? [
          {
            name: t("assets.debtCards"),
            value: data.totalCardDebt,
            color: "#ef4444",
          },
        ]
      : []),
  ].filter((item) => item.value > 0);

  // --- KPI data ---

  const kpiData: Record<string, AssetKpiDef> = {
    "asset-networth": {
      title: t("assets.netWorth"),
      value: formatCurrency(netWorth),
      change:
        netWorth !== 0 ? t("assets.netWorthSubtitle") : undefined,
      changeType:
        netWorth > 0 ? "positive" : netWorth < 0 ? "negative" : "neutral",
      icon: LayoutDashboard,
      watermark: LayoutDashboard,
    },
    "asset-available": {
      title: t("assets.available"),
      value: formatCurrency(data.totalBalance),
      change:
        data.totalBalance > 0 ? t("assets.availableSubtitle") : undefined,
      changeType: data.totalBalance > 0 ? "positive" : "neutral",
      icon: Wallet,
      watermark: Wallet,
    },
    "asset-invested": {
      title: t("assets.invested"),
      value: formatCurrency(data.totalInvestments),
      change:
        data.totalInvestments > 0
          ? t("assets.investedSubtitle")
          : undefined,
      changeType: data.totalInvestments > 0 ? "positive" : "neutral",
      icon: TrendingUp,
      watermark: TrendingUp,
    },
    "asset-carddebt": {
      title: t("assets.cardDebt"),
      value: formatCurrency(data.totalCardDebt),
      change:
        data.totalCardDebt > 0 ? t("assets.cardDebtSubtitle") : undefined,
      changeType: data.totalCardDebt > 0 ? "negative" : "neutral",
      icon: CreditCard,
      watermark: CreditCard,
    },
  };

  // --- Loading state ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
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
              return <SortableAssetKpiCard key={id} id={id} kpi={kpi} />;
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Content: Wealth Distribution + Asset Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wealth Distribution Pie Chart */}
        <ChartCard
          title={t("assets.wealthDistribution")}
          subtitle={
            allocationData.length === 0
              ? t("assets.connectToSeeChart")
              : undefined
          }
        >
          <div className="h-[400px]">
            {allocationData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <LayoutDashboard className="h-12 w-12 opacity-50 mb-2" />
                <p className="text-sm font-medium text-foreground">
                  {t("common:noData")}
                </p>
                <p className="text-xs mt-1">{t("assets.noDataDesc")}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={false}
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label
                      content={({
                        viewBox,
                      }: {
                        viewBox?: { cx?: number; cy?: number };
                      }) => {
                        const cx = viewBox?.cx ?? 0;
                        const cy = viewBox?.cy ?? 0;
                        return (
                          <g>
                            <text
                              x={cx}
                              y={cy - 8}
                              textAnchor="middle"
                              fill="#ffffff"
                              className="text-sm font-medium"
                            >
                              {t("assets.patrimony")}
                            </text>
                            <text
                              x={cx}
                              y={cy + 10}
                              textAnchor="middle"
                              fill="#ffffff"
                              className="text-lg font-bold"
                            >
                              {formatCurrency(netWorth)}
                            </text>
                          </g>
                        );
                      }}
                    />
                  </Pie>
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const value = payload[0]?.value as number;
                      return (
                        <div
                          style={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            color: "#ffffff",
                          }}
                        >
                          <div style={{ color: "#ffffff", fontWeight: 500 }}>
                            {label} :{" "}
                            {typeof value === "number"
                              ? formatCurrency(value)
                              : value}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: "#ffffff" }}
                    itemStyle={{ color: "#ffffff" }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* Asset Summary */}
        <ChartCard
          title={t("assets.assetSummary")}
          subtitle={
            data.accounts.length === 0 && data.investments.length === 0
              ? t("assets.connectAccounts")
              : undefined
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || loading}
              className="shrink-0"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? t("common:syncing") : t("common:sync")}
            </Button>
          }
        >
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 assets-scrollbar">
            {data.accounts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/20 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {t("assets.bankAccounts")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("assets.accountCountOF", {
                          count: data.accounts.length,
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground tabular-nums shrink-0">
                    {formatCurrency(data.totalBalance)}
                  </p>
                </div>
                {accountsByBank.map(
                  ({
                    name: bankName,
                    accounts: bankAccounts,
                    total: bankTotal,
                  }) => {
                    const isExpanded = expandedBanks.has(bankName);
                    return (
                      <div
                        key={bankName}
                        className="rounded-lg border border-white/10 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleBank(bankName)}
                          className="flex items-center justify-between gap-2 w-full pl-4 pr-3 py-2.5 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors text-left min-w-0"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">
                              {bankName}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {t("common:accountCount", {
                                count: bankAccounts.length,
                              })}
                            </span>
                          </div>
                          <span className="text-sm font-medium tabular-nums shrink-0">
                            {formatCurrency(bankTotal)}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-white/10">
                            {bankAccounts.map((acc: any) => (
                              <div
                                key={acc.id || acc.pluggy_account_id}
                                className="flex items-center justify-between gap-2 pl-8 pr-3 py-2 bg-muted/5 min-w-0"
                              >
                                <span className="text-sm truncate text-muted-foreground">
                                  {acc.name &&
                                  acc.name !== (acc.institution_name || "")
                                    ? acc.name
                                    : t("assets.accountFallback")}
                                </span>
                                <span className="text-sm font-medium tabular-nums shrink-0">
                                  {formatCurrency(
                                    parseFloat(acc.current_balance || 0)
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {data.investments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {t("assets.investmentsLabel")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("assets.assetCountOF", {
                          count: data.investments.length,
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(data.totalInvestments)}
                  </p>
                </div>
                {data.investments.slice(0, 8).map((inv: any) => (
                  <div
                    key={inv.id || inv.pluggy_investment_id}
                    className="flex items-center justify-between pl-4 pr-3 py-2 rounded-lg bg-muted/10 border border-border/50"
                  >
                    <div className="text-sm">
                      {inv.name ||
                        inv.type ||
                        t("assets.investmentFallback")}
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(parseFloat(inv.current_value || 0))}
                    </span>
                  </div>
                ))}
                {data.investments.length > 8 && (
                  <p className="text-xs text-muted-foreground pl-4">
                    {t("assets.othersMore", {
                      count: data.investments.length - 8,
                    })}
                  </p>
                )}
              </div>
            )}

            {data.cards.length > 0 && data.totalCardDebt > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-destructive/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {t("assets.creditCards")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("assets.openInvoices")}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-destructive">
                    {formatCurrency(data.totalCardDebt)}
                  </p>
                </div>
              </div>
            )}

            {data.accounts.length === 0 && data.investments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted/50 p-4 mb-3">
                  <Wallet className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">
                  {t("assets.noOpenFinanceAssets")}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {t("assets.noOpenFinanceAssetsDesc")}
                </p>
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default Assets;
