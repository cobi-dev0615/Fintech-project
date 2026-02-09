import { useState, useEffect } from "react";
import { Wallet, CreditCard, TrendingUp, PiggyBank, Clock, BarChart3, RefreshCw } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import ChartCard from "@/components/dashboard/ChartCard";
import { financeApi } from "@/lib/api";
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
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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
        title: "Sincronização concluída",
        description: "Seus dados foram atualizados com sucesso.",
        variant: "success",
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
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-2 pb-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Painel</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visão consolidada da sua vida financeira
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-2 pb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border-2 border-emerald-500/80 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-all">
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
        <div className="rounded-xl border-2 border-blue-500/80 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-all">
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
        <div className="rounded-xl border-2 border-violet-500/80 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-all">
          <ProfessionalKpiCard
            title="Investimentos"
            value={`R$ ${investmentValue.toLocaleString("pt-BR")}`}
            change=""
            changeType="neutral"
            icon={TrendingUp}
            iconClassName="text-violet-500"
            subtitle="em carteira"
          />
        </div>
        <div className="rounded-xl border-2 border-amber-500/80 bg-card h-full p-4 min-h-[88px] sm:min-h-0 flex flex-col justify-center shadow-sm hover:shadow-md hover:shadow-amber-500/5 transition-all">
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

      <div className="mt-6 flex-1 min-h-0">
        <div className="relative overflow-hidden rounded-xl bg-card border border-border p-4 sm:p-5 shadow-sm">
          <NetWorthChart />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
