import { useState, useEffect } from "react";
import { Wallet, CreditCard, TrendingUp, PiggyBank, Clock } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import AlertList, { Alert } from "@/components/dashboard/AlertList";
import { dashboardApi } from "@/lib/api";

const Dashboard = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const summaryData = await dashboardApi.getSummary();
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
      
      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-purple-500/10 border-2 border-violet-500/20 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4">
            <RecentTransactions />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
