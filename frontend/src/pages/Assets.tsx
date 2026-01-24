import { useState, useEffect } from "react";
import { LayoutDashboard, Wallet, TrendingUp, PieChart, ArrowUpRight, ArrowDownRight } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { accountsApi, investmentsApi } from "@/lib/api";
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from "recharts";

const Assets = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalBalance: number;
    totalInvestments: number;
    accounts: any[];
    holdings: any[];
  }>({
    totalBalance: 0,
    totalInvestments: 0,
    accounts: [],
    holdings: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [accountsData, investmentsData, summaryData] = await Promise.all([
          accountsApi.getAll(),
          investmentsApi.getHoldings(),
          investmentsApi.getSummary(),
        ]);

        const totalBalance = accountsData.accounts.reduce(
          (sum: number, acc: any) => sum + parseFloat(acc.balance_cents || 0) / 100,
          0
        );
        const totalInvestments = parseFloat(summaryData.summary?.total_value || 0) / 100;

        setData({
          totalBalance,
          totalInvestments,
          accounts: accountsData.accounts,
          holdings: investmentsData.holdings,
        });
      } catch (error) {
        console.error("Failed to fetch assets data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalAssets = data.totalBalance + data.totalInvestments;

  const allocationData = [
    { name: "Liquidez (Contas)", value: data.totalBalance, color: "#3b82f6" },
    { name: "Investimentos", value: data.totalInvestments, color: "#10b981" },
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Ativos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada de todo o seu patrimônio
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ProfessionalKpiCard
          title="Patrimônio Total"
          value={`R$ ${totalAssets.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={LayoutDashboard}
          changeType="neutral"
          change=""
          subtitle="Consolidado"
        />
        <ProfessionalKpiCard
          title="Disponível"
          value={`R$ ${data.totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          changeType="positive"
          change=""
          subtitle="Saldos em conta"
        />
        <ProfessionalKpiCard
          title="Investido"
          value={`R$ ${data.totalInvestments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          changeType="positive"
          change=""
          subtitle="Ações, FIIs e Renda Fixa"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Distribuição de Patrimônio">
          <div className="h-[300px]">
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
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Resumo por Ativo">
          <div className="space-y-4">
            {data.accounts.length > 0 && (
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Contas Bancárias</p>
                    <p className="text-xs text-muted-foreground">{data.accounts.length} contas conectadas</p>
                  </div>
                </div>
                <p className="font-semibold text-foreground">R$ {data.totalBalance.toLocaleString("pt-BR")}</p>
              </div>
            )}
            
            {data.holdings.length > 0 && (
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10 text-success">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Investimentos</p>
                    <p className="text-xs text-muted-foreground">{data.holdings.length} ativos em carteira</p>
                  </div>
                </div>
                <p className="font-semibold text-foreground">R$ {data.totalInvestments.toLocaleString("pt-BR")}</p>
              </div>
            )}

            {data.accounts.length === 0 && data.holdings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum ativo encontrado. Conecte suas contas para começar.</p>
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default Assets;
