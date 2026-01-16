import { Wallet, CreditCard, TrendingUp, PiggyBank, Clock } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import AlertList, { Alert } from "@/components/dashboard/AlertList";

const Dashboard = () => {
  const alerts: Alert[] = [
    {
      id: "1",
      type: "warning",
      title: "Cartão vence em breve",
      message: "Fatura Nubank de R$ 2.882 vence em 3 dias",
      timestamp: "há 1 hora",
    },
    {
      id: "2",
      type: "info",
      title: "Gastos incomuns",
      message: "Gastos com compras 40% maiores que no mês passado",
      timestamp: "há 3 horas",
    },
    {
      id: "3",
      type: "warning",
      title: "Alerta de saldo baixo",
      message: "Conta corrente abaixo do limite de R$ 500",
      timestamp: "há 5 horas",
    },
  ];

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
          <span>Última sincronização: há 2 minutos</span>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Patrimônio Líquido"
          value="R$ 124.532"
          change="+12,4%"
          changeType="positive"
          icon={PiggyBank}
          subtitle="este mês"
        />
        <ProfessionalKpiCard
          title="Caixa Total"
          value="R$ 23.450"
          change=""
          changeType="neutral"
          icon={Wallet}
          subtitle="3 contas"
        />
        <ProfessionalKpiCard
          title="Investimentos"
          value="R$ 98.200"
          change="+8,2%"
          changeType="positive"
          icon={TrendingUp}
          subtitle="no ano"
        />
        <ProfessionalKpiCard
          title="Cartões de Crédito"
          value="R$ 2.882"
          change="Vence em 3 dias"
          changeType="negative"
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
