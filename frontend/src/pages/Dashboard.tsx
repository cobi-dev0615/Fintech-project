import { useState, useEffect } from "react";
import { Wallet, CreditCard, TrendingUp, PiggyBank, Clock, BarChart3, RefreshCw } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import ChartCard from "@/components/dashboard/ChartCard";
import AlertList, { Alert } from "@/components/dashboard/AlertList";
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
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
        totalTransactions: transactionsData.pagination?.total || transactionsData.total || 0,
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
          // Convert transactions to alerts format if needed
          const alertsList: Alert[] = [];
          if (summaryData.unreadAlertsCount > 0) {
            alertsList.push({
              id: "alerts",
              type: "info",
              title: "Novos alertas",
              message: `Você tem ${summaryData.unreadAlertsCount} alerta(s) não lido(s)`,
              timestamp: "Recente",
            });
          }
          setAlerts(alertsList);
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada da sua vida financeira
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Última sincronização: agora</span>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-[2px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="bg-card rounded-lg h-full">
            <ProfessionalKpiCard
              title="Patrimônio Líquido"
              value={`R$ ${parseFloat(netWorth).toLocaleString("pt-BR")}`}
              change=""
              changeType="neutral"
              icon={PiggyBank}
              subtitle="total"
            />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-[2px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="bg-card rounded-lg h-full">
            <ProfessionalKpiCard
              title="Caixa Total"
              value={`R$ ${parseFloat(cashBalance).toLocaleString("pt-BR")}`}
              change=""
              changeType="neutral"
              icon={Wallet}
              subtitle="disponível"
            />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 p-[2px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="bg-card rounded-lg h-full">
            <ProfessionalKpiCard
              title="Investimentos"
              value={`R$ ${parseFloat(investmentValue).toLocaleString("pt-BR")}`}
              change=""
              changeType="neutral"
              icon={TrendingUp}
              subtitle="em carteira"
            />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-[2px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="bg-card rounded-lg h-full">
            <ProfessionalKpiCard
              title="Transações"
              value={summary.recentTransactionsCount.toString()}
              change="últimos 30 dias"
              changeType="neutral"
              icon={CreditCard}
              subtitle=""
            />
          </div>
        </div>
      </div>
      
      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-2 border-indigo-500/20 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4">
            <NetWorthChart />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-500/10 via-gray-500/10 to-zinc-500/10 border-2 border-slate-500/20 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4">
            <AlertList alerts={alerts} />
          </div>
        </div>
      </div>
      
      {/* Account Balances by Institution */}
      {openFinanceData.groupedAccounts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Saldos por Instituição</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openFinanceData.groupedAccounts.map((group: any, idx: number) => (
              <ChartCard key={idx} className="p-4">
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

      {/* Recent Transactions */}
      {openFinanceData.transactions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Transações Recentes</h2>
          <ChartCard>
            <div className="space-y-2">
              {openFinanceData.transactions.slice(0, 10).map((tx: any) => (
                <div key={tx.id || tx.pluggy_transaction_id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{tx.description || tx.merchant || "Transação"}</p>
                    <p className="text-sm text-muted-foreground">
                      {tx.date ? new Date(tx.date).toLocaleDateString("pt-BR") : "N/A"} • {tx.account_name || tx.institution_name || "Conta"}
                    </p>
                    {tx.category && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {tx.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${parseFloat(tx.amount || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {parseFloat(tx.amount || 0) >= 0 ? "+" : ""}R$ {Math.abs(parseFloat(tx.amount || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {tx.status && (
                      <span className={`text-xs ${tx.status === "PENDING" ? "text-amber-600" : "text-green-600"}`}>
                        {tx.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
