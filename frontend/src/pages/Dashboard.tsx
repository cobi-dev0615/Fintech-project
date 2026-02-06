import { useState, useEffect } from "react";
import { Wallet, CreditCard, TrendingUp, PiggyBank, Clock, BarChart3, RefreshCw } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import ChartCard from "@/components/dashboard/ChartCard";
import { financeApi, dashboardApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
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
  const [legacySummary, setLegacySummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchOpenFinanceData();
      toast({
        title: "Sincronização concluída",
        description: "Seus dados foram atualizados com sucesso.",
      });
    } catch (err: any) {
      toast({
        title: "Erro na sincronização",
        description: err?.error || "Não foi possível sincronizar os dados.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch both open finance data and legacy summary
        const [summaryData] = await Promise.all([
          dashboardApi.getSummary().catch(() => null),
          fetchOpenFinanceData(),
        ]);
        
        if (summaryData) {
          setLegacySummary(summaryData);
        }
        setError(null);
      } catch (err: any) {
        setError(err?.error || "Erro ao carregar dados");
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Calculate totals from open finance data
  const netWorth = openFinanceData.totalBalance + openFinanceData.totalInvestments;
  const cashBalance = openFinanceData.totalBalance;
  const investmentValue = openFinanceData.totalInvestments;

  return (
    <div className="space-y-5 sm:space-y-6 pb-6">
      {/* Page Header - mobile-first */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Painel</h1>
          <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Visão consolidada da sua vida financeira
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Última sincronização: agora</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 touch-manipulation"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Atualizar"}
          </Button>
        </div>
      </div>
      
      {/* KPI Cards - 2×2 on mobile/tablet, 4 in a row on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border-2 border-emerald-500 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm active:scale-[0.99] sm:hover:shadow-md transition-transform duration-200">
          <ProfessionalKpiCard
            title="Patrimônio Líquido"
            value={`R$ ${netWorth.toLocaleString("pt-BR")}`}
            change=""
            changeType="neutral"
            icon={PiggyBank}
            iconClassName="text-emerald-500"
            subtitle="total"
          />
        </div>
        <div className="rounded-xl border-2 border-blue-500 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm active:scale-[0.99] sm:hover:shadow-md transition-transform duration-200">
          <ProfessionalKpiCard
            title="Caixa Total"
            value={`R$ ${cashBalance.toLocaleString("pt-BR")}`}
            change=""
            changeType="neutral"
            icon={Wallet}
            iconClassName="text-blue-500"
            subtitle="disponível"
          />
        </div>
        <div className="rounded-xl border-2 border-purple-500 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm active:scale-[0.99] sm:hover:shadow-md transition-transform duration-200">
          <ProfessionalKpiCard
            title="Investimentos"
            value={`R$ ${investmentValue.toLocaleString("pt-BR")}`}
            change=""
            changeType="neutral"
            icon={TrendingUp}
            iconClassName="text-purple-500"
            subtitle="em carteira"
          />
        </div>
        <div className="rounded-xl border-2 border-amber-500 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm active:scale-[0.99] sm:hover:shadow-md transition-transform duration-200">
          <ProfessionalKpiCard
            title="Transações"
            value={openFinanceData.totalTransactions.toString()}
            change="total"
            changeType="neutral"
            icon={BarChart3}
            iconClassName="text-amber-500"
            subtitle={`${openFinanceData.cards.length} cartão(ões)`}
          />
        </div>
      </div>
      
      {/* Charts - mobile-friendly padding and overflow */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 sm:border-2 shadow-sm sm:shadow-md">
        <div className="bg-card/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 min-w-0 overflow-hidden">
          <NetWorthChart />
        </div>
      </div>
      
      {/* Account Balances by Institution */}
      {openFinanceData.groupedAccounts.length > 0 && (
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Saldos por Instituição</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {openFinanceData.groupedAccounts.map((group: any, idx: number) => (
              <ChartCard key={idx} className="p-4 rounded-xl min-h-[72px] sm:min-h-0">
                <div className="flex items-center gap-3 mb-3">
                  {group.institution_logo && (
                    <img src={group.institution_logo} alt={group.institution_name} className="h-8 w-8 rounded" />
                  )}
                  <div>
                    <h3 className="font-semibold">{group.institution_name}</h3>
                    <p className="text-xs text-muted-foreground">{group.accounts.length} conta(s)</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  R$ {group.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </ChartCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
