import { useState, useEffect } from "react";
import { Wallet, TrendingUp, PiggyBank, Clock, BarChart3, RefreshCw } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import { financeApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [openFinanceData, setOpenFinanceData] = useState<{
    accounts: any[];
    groupedAccounts: any[];
    transactions: any[];
    investments: any[];
    cards: any[];
    totalBalance: number;
    totalInvestments: number;
    totalTransactions: number;
  }>({
    accounts: [],
    groupedAccounts: [],
    transactions: [],
    investments: [],
    cards: [],
    totalBalance: 0,
    totalInvestments: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(t('common:locale'), { style: 'currency', currency: 'BRL' }).format(value);

  const fetchOpenFinanceData = async () => {
    try {
      const [accountsData, transactionsData, investmentsData, cardsData] = await Promise.all([
        financeApi.getAccounts().catch(() => ({ accounts: [], grouped: [], total: 0 })),
        financeApi.getTransactions({ page: 1, limit: 10 }).catch(() => ({ transactions: [], pagination: { total: 0 } })),
        financeApi.getInvestments().catch(() => ({ investments: [], total: 0, breakdown: [] })),
        financeApi.getCards().catch(() => ({ cards: [] })),
      ]);

      setOpenFinanceData({
        accounts: accountsData.accounts || [],
        groupedAccounts: accountsData.grouped || [],
        transactions: transactionsData.transactions || [],
        investments: investmentsData.investments || [],
        cards: cardsData.cards || [],
        totalBalance: accountsData.total || 0,
        totalInvestments: investmentsData.total || 0,
        totalTransactions: transactionsData.pagination?.total ?? 0,
      });
    } catch (err: any) {
      console.error("Error fetching open finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchOpenFinanceData();
      toast({
        title: t('dashboard:sync.success'),
        description: t('dashboard:sync.successDesc'),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t('dashboard:sync.error'),
        description: err?.error || t('dashboard:sync.errorDesc'),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchOpenFinanceData();
  }, []);

  const netWorth = openFinanceData.totalBalance + openFinanceData.totalInvestments;
  const cashBalance = openFinanceData.totalBalance;
  const investmentValue = openFinanceData.totalInvestments;

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 py-2 pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('dashboard:title')}</h1>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {t('dashboard:subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Clock className="h-3 w-3" />
            <span>{t('dashboard:lastSync')}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 h-8 px-3 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? t('common:syncing') : t('common:sync')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title={t('dashboard:netWorth')}
          value={formatCurrency(netWorth)}
          change=""
          changeType="neutral"
          icon={PiggyBank}
          accent="success"
          subtitle={t('common:total')}
          showMenu
        />
        <ProfessionalKpiCard
          title={t('dashboard:totalCash')}
          value={formatCurrency(cashBalance)}
          change=""
          changeType="neutral"
          icon={Wallet}
          accent="primary"
          subtitle={t('dashboard:available')}
          showMenu
        />
        <ProfessionalKpiCard
          title={t('dashboard:investments')}
          value={formatCurrency(investmentValue)}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          accent="info"
          subtitle={t('dashboard:inPortfolio')}
          showMenu
        />
        <ProfessionalKpiCard
          title={t('dashboard:transactions')}
          value={openFinanceData.totalTransactions.toString()}
          change={t('common:total')}
          changeType="neutral"
          icon={BarChart3}
          accent="warning"
          subtitle={t('common:cardCount', { count: openFinanceData.cards.length })}
          showMenu
        />
      </div>

      {/* Chart */}
      <div className="mt-6 flex-1 min-h-0">
        <NetWorthChart />
      </div>
    </div>
  );
};

export default Dashboard;
