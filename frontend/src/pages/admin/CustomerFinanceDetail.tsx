import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
  Building2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TYPE_LABELS: Record<string, string> = {
  fund: "Fundos",
  cdb: "CDB",
  lci: "LCI",
  lca: "LCA",
  stock: "Ações",
  etf: "ETFs",
  reit: "FIIs",
  other: "Outros",
};

interface FinanceData {
  user: { id: string; name: string; email: string };
  summary: { cash: number; investments: number; debt: number; netWorth: number };
  connections: any[];
  accounts: any[];
  investments: any[];
  breakdown: any[];
  cards: any[];
  transactions: any[];
}

const CustomerFinanceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await adminApi.getCustomerFinance(id);
        setData(res);
      } catch (err: any) {
        setError(err?.error || "Falha ao carregar dados financeiros");
        toast({
          title: "Erro",
          description: err?.error || "Falha ao carregar dados financeiros",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, toast]);

  const formatCurrency = (val: number | string) =>
    `R$ ${Number(val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/admin/users")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <p className="text-destructive">{error || "Dados não encontrados"}</p>
      </div>
    );
  }

  const { user, summary, connections, accounts, investments, breakdown, cards, transactions } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dados do Open Finance</h1>
            <p className="text-sm text-muted-foreground">
              {user.name} — {user.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Dados consolidados das conexões Open Finance deste cliente.
            </p>
          </div>
        </div>
      </div>

      {/* Resumo Financeiro - wallet summary (same as consultant client profile) */}
      <ChartCard title="Resumo Financeiro">
        <p className="text-sm text-muted-foreground">
          Visão consolidada das finanças do cliente. Os dados são atualizados automaticamente
          através das conexões com instituições financeiras.
        </p>
      </ChartCard>

      {/* Summary KPIs - wallet info, order aligned with consultant (Patrimônio, Caixa, Investimentos, Dívidas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Patrimônio Líquido"
          value={formatCurrency(summary.netWorth)}
          change=""
          changeType="neutral"
          icon={Wallet}
          subtitle="Cash + Invest. - Dívidas"
        />
        <ProfessionalKpiCard
          title="Caixa"
          value={formatCurrency(summary.cash)}
          change=""
          changeType="neutral"
          icon={DollarSign}
          subtitle="Contas (Open Finance)"
        />
        <ProfessionalKpiCard
          title="Investimentos"
          value={formatCurrency(summary.investments)}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle="Open Finance"
        />
        <ProfessionalKpiCard
          title="Dívidas"
          value={formatCurrency(summary.debt)}
          change=""
          changeType="neutral"
          icon={CreditCard}
          subtitle="Cartões (Open Finance)"
        />
      </div>

      {/* Connections */}
      <ChartCard title="Conexões Open Finance" subtitle={`${connections.length} instituição(ões) conectada(s)`}>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma conexão Open Finance. Os dados abaixo são obtidos quando o cliente conecta instituições via Open Finance.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30"
              >
                {c.institution_logo ? (
                  <img src={c.institution_logo} alt="" className="h-6 w-6 object-contain" />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{c.institution_name || "Instituição"}</span>
                <span className="text-xs text-muted-foreground">({c.status})</span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Accounts - Open Finance */}
      <ChartCard title="Contas Bancárias (Open Finance)" subtitle={`${accounts.length} conta(s) sincronizada(s)`}>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma conta do Open Finance encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Nome</th>
                  <th className="text-left py-2 px-3">Tipo</th>
                  <th className="text-left py-2 px-3">Instituição</th>
                  <th className="text-right py-2 px-3">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="py-2 px-3">{a.name}</td>
                    <td className="py-2 px-3">{a.type || "-"}</td>
                    <td className="py-2 px-3">{a.institution_name || "-"}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(a.current_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Investments - Open Finance */}
      <ChartCard title="Investimentos (Open Finance)" subtitle={`${investments.length} posição(ões)`}>
        {investments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum investimento do Open Finance encontrado.</p>
        ) : (
          <div className="space-y-4">
            {breakdown.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Alocação por tipo</h4>
                {breakdown.map((b) => {
                  const pct = summary.investments > 0 ? (b.total / summary.investments) * 100 : 0;
                  return (
                    <div key={b.type} className="flex items-center gap-3">
                      <span className="text-sm w-20">{TYPE_LABELS[b.type] || b.type}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-28 text-right">{formatCurrency(b.total)}</span>
                      <span className="text-xs text-muted-foreground w-12">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-left py-2 px-3">Nome</th>
                    <th className="text-left py-2 px-3">Instituição</th>
                    <th className="text-right py-2 px-3">Quantidade</th>
                    <th className="text-right py-2 px-3">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50">
                      <td className="py-2 px-3">{inv.type || "-"}</td>
                      <td className="py-2 px-3">{inv.name || "-"}</td>
                      <td className="py-2 px-3">{inv.institution_name || "-"}</td>
                      <td className="py-2 px-3 text-right">{Number(inv.quantity || 0).toLocaleString("pt-BR")}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(inv.current_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ChartCard>

      {/* Credit Cards - Open Finance */}
      <ChartCard title="Cartões de Crédito (Open Finance)" subtitle={`${cards.length} cartão(ões)`}>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum cartão do Open Finance encontrado.</p>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {card.brand || "Cartão"} ****{card.last4 || "****"}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.institution_name || "-"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-destructive">{formatCurrency(card.openDebt)}</p>
                  <p className="text-xs text-muted-foreground">Fatura em aberto</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Recent Transactions - Open Finance */}
      <ChartCard title="Transações Recentes (Open Finance)" subtitle={`Últimas ${transactions.length} transações`}>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma transação do Open Finance encontrada.</p>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Data</th>
                  <th className="text-left py-2 px-3">Descrição</th>
                  <th className="text-left py-2 px-3">Conta</th>
                  <th className="text-left py-2 px-3">Instituição</th>
                  <th className="text-right py-2 px-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const amount = Number(tx.amount || 0);
                  const isIncome = amount > 0;
                  return (
                    <tr key={tx.id} className="border-b border-border/50">
                      <td className="py-2 px-3">{format(new Date(tx.date), "dd/MM/yyyy", { locale: ptBR })}</td>
                      <td className="py-2 px-3">{tx.description || tx.merchant || "-"}</td>
                      <td className="py-2 px-3">{tx.account_name || "-"}</td>
                      <td className="py-2 px-3">{tx.institution_name || "-"}</td>
                      <td
                        className={`py-2 px-3 text-right font-medium ${isIncome ? "text-success" : "text-destructive"}`}
                      >
                        {isIncome ? "+" : ""}{formatCurrency(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default CustomerFinanceDetail;
