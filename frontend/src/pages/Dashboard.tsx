import { useState, useEffect } from "react";
import { Wallet, CreditCard, TrendingUp, PiggyBank, Clock } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import AlertList, { Alert } from "@/components/dashboard/AlertList";
import { dashboardApi, accountsApi } from "@/lib/api";

const Dashboard = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryData, transactionsData] = await Promise.all([
          dashboardApi.getSummary(),
          accountsApi.getTransactions(undefined, 5, 0),
        ]);
        setSummary(summaryData);
        
        // Convert transactions to alerts format if needed
        // For now, we'll create basic alerts from unread alerts count
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

  if (error || !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error || "Erro ao carregar dados"}</p>
      </div>
    );
  }

  const netWorth = (summary.netWorth / 100).toFixed(2);
  const cashBalance = (summary.cashBalance / 100).toFixed(2);
  const investmentValue = (summary.investmentValue / 100).toFixed(2);

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
        <ProfessionalKpiCard
          title="Patrimônio Líquido"
          value={`R$ ${parseFloat(netWorth).toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={PiggyBank}
          subtitle="total"
        />
        <ProfessionalKpiCard
          title="Caixa Total"
          value={`R$ ${parseFloat(cashBalance).toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={Wallet}
          subtitle="disponível"
        />
        <ProfessionalKpiCard
          title="Investimentos"
          value={`R$ ${parseFloat(investmentValue).toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle="em carteira"
        />
        <ProfessionalKpiCard
          title="Transações"
          value={summary.recentTransactionsCount.toString()}
          change="últimos 30 dias"
          changeType="neutral"
          icon={CreditCard}
          subtitle=""
        />
      </div>
      
      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NetWorthChart />
        </div>
        <div>
          <AlertList alerts={alerts} />
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions />
      </div>
    </div>
  );
};

export default Dashboard;
