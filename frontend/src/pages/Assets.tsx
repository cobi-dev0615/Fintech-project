import { useState, useEffect, useMemo } from "react";
import { LayoutDashboard, Wallet, TrendingUp, CreditCard, RefreshCw, Building2, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
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
  Label
} from "recharts";

const Assets = () => {
  const { t } = useTranslation(['accounts', 'common']);
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accountsData, investmentsData, cardsData] = await Promise.all([
        financeApi.getAccounts().catch(() => ({ accounts: [], grouped: [], total: 0 })),
        financeApi.getInvestments().catch(() => ({ investments: [], total: 0, breakdown: [] })),
        financeApi.getCards().catch(() => ({ cards: [] })),
      ]);

      const totalBalance = typeof accountsData.total === "number" ? accountsData.total : 0;
      const totalInvestments = typeof investmentsData.total === "number" ? investmentsData.total : 0;
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
        title: t('common:syncComplete'),
        description: t('accounts:assets.syncSuccess'),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t('common:syncError'),
        description: err?.error || t('common:syncErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const netWorth = data.totalBalance + data.totalInvestments - data.totalCardDebt;
  const totalAssets = data.totalBalance + data.totalInvestments;

  const accountsByBank = useMemo(() => {
    const map = new Map<string, { accounts: any[]; total: number }>();
    (data.accounts || []).forEach((acc: any) => {
      const bank = acc.institution_name || t('common:others');
      if (!map.has(bank)) map.set(bank, { accounts: [], total: 0 });
      const entry = map.get(bank)!;
      entry.accounts.push(acc);
      entry.total += parseFloat(acc.current_balance || 0);
    });
    return Array.from(map.entries()).map(([name, { accounts, total }]) => ({ name, accounts, total }));
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
    { name: t('assets.liquidityAccounts'), value: data.totalBalance, color: "#3b82f6" },
    { name: t('assets.investmentsLabel'), value: data.totalInvestments, color: "#10b981" },
    ...(data.totalCardDebt > 0
      ? [{ name: t('assets.debtCards'), value: data.totalCardDebt, color: "#ef4444" }]
      : []),
  ].filter((item) => item.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('assets.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('assets.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing || loading}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? t('common:syncing') : t('common:sync')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        <div className="rounded-xl border-2 border-emerald-500/70 bg-card p-4 min-w-0 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow">
          <ProfessionalKpiCard
            title={t('assets.netWorth')}
            value={formatCurrency(netWorth)}
            icon={LayoutDashboard}
            iconClassName="text-emerald-600 dark:text-emerald-400"
            changeType="neutral"
            change=""
            subtitle={t('assets.netWorthSubtitle')}
          />
        </div>
        <div className="rounded-xl border-2 border-blue-500/70 bg-card p-4 min-w-0 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow">
          <ProfessionalKpiCard
            title={t('assets.available')}
            value={formatCurrency(data.totalBalance)}
            icon={Wallet}
            iconClassName="text-blue-600 dark:text-blue-400"
            changeType="neutral"
            change=""
            subtitle={t('assets.availableSubtitle')}
          />
        </div>
        <div className="rounded-xl border-2 border-violet-500/70 bg-card p-4 min-w-0 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-shadow">
          <ProfessionalKpiCard
            title={t('assets.invested')}
            value={formatCurrency(data.totalInvestments)}
            icon={TrendingUp}
            iconClassName="text-violet-600 dark:text-violet-400"
            changeType="neutral"
            change=""
            subtitle={t('assets.investedSubtitle')}
          />
        </div>
        <div className="rounded-xl border-2 border-amber-500/70 bg-card p-4 min-w-0 shadow-sm hover:shadow-md hover:shadow-amber-500/5 transition-shadow">
          <ProfessionalKpiCard
            title={t('assets.cardDebt')}
            value={formatCurrency(data.totalCardDebt)}
            icon={CreditCard}
            iconClassName="text-amber-600 dark:text-amber-400"
            changeType="neutral"
            change=""
            subtitle={t('assets.cardDebtSubtitle')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={t('assets.wealthDistribution')} subtitle={allocationData.length === 0 ? t('assets.connectToSeeChart') : undefined}>
          <div className="h-[400px]">
            {allocationData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <LayoutDashboard className="h-12 w-12 opacity-50 mb-2" />
                <p className="text-sm font-medium text-foreground">{t('common:noData')}</p>
                <p className="text-xs mt-1">{t('assets.noDataDesc')}</p>
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
                      content={({ viewBox }: { viewBox?: { cx?: number; cy?: number } }) => {
                        const cx = viewBox?.cx ?? 0;
                        const cy = viewBox?.cy ?? 0;
                        return (
                          <g>
                            <text x={cx} y={cy - 8} textAnchor="middle" fill="#ffffff" className="text-sm font-medium">
                              {t('assets.patrimony')}
                            </text>
                            <text x={cx} y={cy + 10} textAnchor="middle" fill="#ffffff" className="text-lg font-bold">
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
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: '#ffffff',
                          }}
                        >
                          <div style={{ color: '#ffffff', fontWeight: 500 }}>
                            {label} : {typeof value === 'number' ? formatCurrency(value) : value}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title={t('assets.assetSummary')} subtitle={data.accounts.length === 0 && data.investments.length === 0 ? t('assets.connectAccounts') : undefined}>
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 assets-scrollbar">
            {data.accounts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/20 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{t('assets.bankAccounts')}</p>
                      <p className="text-xs text-muted-foreground">{t('assets.accountCountOF', { count: data.accounts.length })}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground tabular-nums shrink-0">{formatCurrency(data.totalBalance)}</p>
                </div>
                {accountsByBank.map(({ name: bankName, accounts: bankAccounts, total: bankTotal }) => {
                  const isExpanded = expandedBanks.has(bankName);
                  return (
                    <div key={bankName} className="rounded-lg border border-border/50 overflow-hidden">
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
                          <span className="text-sm font-medium text-foreground truncate">{bankName}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{t('common:accountCount', { count: bankAccounts.length })}</span>
                        </div>
                        <span className="text-sm font-medium tabular-nums shrink-0">{formatCurrency(bankTotal)}</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border/50">
                          {bankAccounts.map((acc: any) => (
                            <div key={acc.id || acc.pluggy_account_id} className="flex items-center justify-between gap-2 pl-8 pr-3 py-2 bg-muted/5 min-w-0">
                              <span className="text-sm truncate text-muted-foreground">
                                {acc.name && acc.name !== (acc.institution_name || "") ? acc.name : t('assets.accountFallback')}
                              </span>
                              <span className="text-sm font-medium tabular-nums shrink-0">{formatCurrency(parseFloat(acc.current_balance || 0))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                      <p className="font-medium">{t('assets.investmentsLabel')}</p>
                      <p className="text-xs text-muted-foreground">{t('assets.assetCountOF', { count: data.investments.length })}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground">{formatCurrency(data.totalInvestments)}</p>
                </div>
                {data.investments.slice(0, 8).map((inv: any) => (
                  <div key={inv.id || inv.pluggy_investment_id} className="flex items-center justify-between pl-4 pr-3 py-2 rounded-lg bg-muted/10 border border-border/50">
                    <div className="text-sm">{inv.name || inv.type || t('assets.investmentFallback')}</div>
                    <span className="text-sm font-medium">{formatCurrency(parseFloat(inv.current_value || 0))}</span>
                  </div>
                ))}
                {data.investments.length > 8 && (
                  <p className="text-xs text-muted-foreground pl-4">{t('assets.othersMore', { count: data.investments.length - 8 })}</p>
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
                      <p className="font-medium">{t('assets.creditCards')}</p>
                      <p className="text-xs text-muted-foreground">{t('assets.openInvoices')}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-destructive">{formatCurrency(data.totalCardDebt)}</p>
                </div>
              </div>
            )}

            {data.accounts.length === 0 && data.investments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted/50 p-4 mb-3">
                  <Wallet className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">{t('assets.noOpenFinanceAssets')}</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {t('assets.noOpenFinanceAssetsDesc')}
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
