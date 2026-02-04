import { useState, useEffect } from "react";
import { LayoutDashboard, Wallet, TrendingUp, CreditCard, RefreshCw, Building2 } from "lucide-react";
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
  Legend 
} from "recharts";

const Assets = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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
        title: "Sincronização concluída",
        description: "Seus ativos foram atualizados com sucesso.",
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

  const netWorth = data.totalBalance + data.totalInvestments - data.totalCardDebt;
  const totalAssets = data.totalBalance + data.totalInvestments;

  const allocationData = [
    { name: "Liquidez (Contas)", value: data.totalBalance, color: "#3b82f6" },
    { name: "Investimentos", value: data.totalInvestments, color: "#10b981" },
    ...(data.totalCardDebt > 0
      ? [{ name: "Dívida (Cartões)", value: data.totalCardDebt, color: "#ef4444" }]
      : []),
  ].filter((item) => item.value > 0);

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
            Dados do Open Finance — visão consolidada do seu patrimônio
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando…" : "Atualizar"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <ProfessionalKpiCard
          title="Patrimônio Líquido"
          value={`R$ ${netWorth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={LayoutDashboard}
          changeType="neutral"
          change=""
          subtitle="Contas + Investimentos − Cartões"
        />
        <ProfessionalKpiCard
          title="Disponível"
          value={`R$ ${data.totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          changeType="positive"
          change=""
          subtitle="Saldos em conta (Open Finance)"
        />
        <ProfessionalKpiCard
          title="Investido"
          value={`R$ ${data.totalInvestments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          changeType="positive"
          change=""
          subtitle="Renda fixa, fundos e outros"
        />
        {data.totalCardDebt > 0 && (
          <ProfessionalKpiCard
            title="Dívida em cartões"
            value={`R$ ${data.totalCardDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={CreditCard}
            changeType="negative"
            change=""
            subtitle="Faturas em aberto"
          />
        )}
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

        <ChartCard title="Resumo por Ativo (Open Finance)">
          <div className="space-y-4 max-h-[320px] overflow-y-auto">
            {data.accounts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Contas Bancárias</p>
                      <p className="text-xs text-muted-foreground">{data.accounts.length} conta(s) • Open Finance</p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground">R$ {data.totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                {data.accounts.map((acc: any) => (
                  <div key={acc.id || acc.pluggy_account_id} className="flex items-center justify-between pl-4 pr-3 py-2 rounded-lg bg-muted/10 border border-border/50">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{acc.institution_name || acc.name || "Conta"}</span>
                      {acc.name && acc.name !== (acc.institution_name || "") && (
                        <span className="text-xs text-muted-foreground">— {acc.name}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium">R$ {parseFloat(acc.current_balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
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
                      <p className="font-medium">Investimentos</p>
                      <p className="text-xs text-muted-foreground">{data.investments.length} ativo(s) • Open Finance</p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground">R$ {data.totalInvestments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                {data.investments.slice(0, 8).map((inv: any) => (
                  <div key={inv.id || inv.pluggy_investment_id} className="flex items-center justify-between pl-4 pr-3 py-2 rounded-lg bg-muted/10 border border-border/50">
                    <div className="text-sm">{inv.name || inv.type || "Investimento"}</div>
                    <span className="text-sm font-medium">R$ {parseFloat(inv.current_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {data.investments.length > 8 && (
                  <p className="text-xs text-muted-foreground pl-4">+ {data.investments.length - 8} outros</p>
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
                      <p className="font-medium">Cartões de crédito</p>
                      <p className="text-xs text-muted-foreground">Faturas em aberto</p>
                    </div>
                  </div>
                  <p className="font-semibold text-destructive">R$ {data.totalCardDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            )}

            {data.accounts.length === 0 && data.investments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum ativo do Open Finance. Conecte suas contas em Conexões para ver saldos e investimentos aqui.</p>
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default Assets;
