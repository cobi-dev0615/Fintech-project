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
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation(['admin', 'common']);
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getTypeLabel = (type: string) => {
    if (type === 'fund') return t('admin:customerFinance.investmentTypes.fund');
    if (type === 'cdb') return t('admin:customerFinance.investmentTypes.cdb');
    if (type === 'lci') return t('admin:customerFinance.investmentTypes.lci');
    if (type === 'lca') return t('admin:customerFinance.investmentTypes.lca');
    if (type === 'stock') return t('admin:customerFinance.investmentTypes.stock');
    if (type === 'etf') return t('admin:customerFinance.investmentTypes.etf');
    if (type === 'reit') return t('admin:customerFinance.investmentTypes.reit');
    if (type === 'other') return t('admin:customerFinance.investmentTypes.other');
    return type;
  };

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await adminApi.getCustomerFinance(id);
        setData(res);
      } catch (err: any) {
        setError(err?.error || t('admin:customerFinance.errorLoading'));
        toast({
          title: t('common:error'),
          description: err?.error || t('admin:customerFinance.errorLoading'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, toast]);

  const formatCurrency = (val: number | string) =>
    `R$ ${Number(val || 0).toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}`;

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
          {t('common:back')}
        </Button>
        <p className="text-destructive">{error || t('admin:customerFinance.dataNotFound')}</p>
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
            <h1 className="text-2xl font-bold text-foreground">{t('admin:customerFinance.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {user.name} — {user.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin:customerFinance.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Resumo Financeiro - wallet summary (same as consultant client profile) */}
      <ChartCard title={t('admin:customerFinance.financialSummary')}>
        <p className="text-sm text-muted-foreground">
          {t('admin:customerFinance.financialSummaryDescription')}
        </p>
      </ChartCard>

      {/* Summary KPIs - wallet info, order aligned with consultant (Patrimônio, Caixa, Investimentos, Dívidas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title={t('admin:customerFinance.kpis.netWorth')}
          value={formatCurrency(summary.netWorth)}
          change=""
          changeType="neutral"
          icon={Wallet}
          subtitle={t('admin:customerFinance.kpis.netWorthSubtitle')}
        />
        <ProfessionalKpiCard
          title={t('admin:customerFinance.kpis.cash')}
          value={formatCurrency(summary.cash)}
          change=""
          changeType="neutral"
          icon={DollarSign}
          subtitle={t('admin:customerFinance.kpis.cashSubtitle')}
        />
        <ProfessionalKpiCard
          title={t('admin:customerFinance.kpis.investments')}
          value={formatCurrency(summary.investments)}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle={t('admin:customerFinance.kpis.investmentsSubtitle')}
        />
        <ProfessionalKpiCard
          title={t('admin:customerFinance.kpis.debt')}
          value={formatCurrency(summary.debt)}
          change=""
          changeType="neutral"
          icon={CreditCard}
          subtitle={t('admin:customerFinance.kpis.debtSubtitle')}
        />
      </div>

      {/* Connections */}
      <ChartCard title={t('admin:customerFinance.connections.title')} subtitle={t('admin:customerFinance.connections.subtitle', { count: connections.length })}>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('admin:customerFinance.connections.empty')}</p>
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
                <span className="text-sm font-medium">{c.institution_name || t('admin:customerFinance.connections.institution')}</span>
                <span className="text-xs text-muted-foreground">({c.status})</span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Accounts - Open Finance */}
      <ChartCard title={t('admin:customerFinance.accounts.title')} subtitle={t('admin:customerFinance.accounts.subtitle', { count: accounts.length })}>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('admin:customerFinance.accounts.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">{t('admin:customerFinance.accounts.tableHeaders.name')}</th>
                  <th className="text-left py-2 px-3">{t('admin:customerFinance.accounts.tableHeaders.type')}</th>
                  <th className="text-left py-2 px-3">{t('admin:customerFinance.accounts.tableHeaders.institution')}</th>
                  <th className="text-right py-2 px-3">{t('admin:customerFinance.accounts.tableHeaders.balance')}</th>
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
      <ChartCard title={t('admin:customerFinance.investments.title')} subtitle={t('admin:customerFinance.investments.subtitle', { count: investments.length })}>
        {investments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('admin:customerFinance.investments.empty')}</p>
        ) : (
          <div className="space-y-4">
            {breakdown.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{t('admin:customerFinance.investments.allocationByType')}</h4>
                {breakdown.map((b) => {
                  const pct = summary.investments > 0 ? (b.total / summary.investments) * 100 : 0;
                  return (
                    <div key={b.type} className="flex items-center gap-3">
                      <span className="text-sm w-20">{getTypeLabel(b.type)}</span>
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
                    <th className="text-left py-2 px-3">{t('admin:customerFinance.investments.tableHeaders.type')}</th>
                    <th className="text-left py-2 px-3">{t('admin:customerFinance.investments.tableHeaders.name')}</th>
                    <th className="text-left py-2 px-3">{t('admin:customerFinance.investments.tableHeaders.institution')}</th>
                    <th className="text-right py-2 px-3">{t('admin:customerFinance.investments.tableHeaders.quantity')}</th>
                    <th className="text-right py-2 px-3">{t('admin:customerFinance.investments.tableHeaders.value')}</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50">
                      <td className="py-2 px-3">{inv.type || "-"}</td>
                      <td className="py-2 px-3">{inv.name || "-"}</td>
                      <td className="py-2 px-3">{inv.institution_name || "-"}</td>
                      <td className="py-2 px-3 text-right">{Number(inv.quantity || 0).toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US')}</td>
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
      <ChartCard title={t('admin:customerFinance.cards.title')} subtitle={t('admin:customerFinance.cards.subtitle', { count: cards.length })}>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('admin:customerFinance.cards.empty')}</p>
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
                      {card.brand || t('admin:customerFinance.cards.card')} ****{card.last4 || "****"}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.institution_name || "-"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-destructive">{formatCurrency(card.openDebt)}</p>
                  <p className="text-xs text-muted-foreground">{t('admin:customerFinance.cards.openInvoice')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Recent Transactions - Open Finance */}
      <ChartCard title={t('admin:customerFinance.transactions.title')} subtitle={t('admin:customerFinance.transactions.subtitle', { count: transactions.length })}>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('admin:customerFinance.transactions.empty')}</p>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">{t('admin:customerFinance.transactions.tableHeaders.date')}</th>
                  <th className="text-left py-2 px-3">{t('admin:customerFinance.transactions.tableHeaders.description')}</th>
                  <th className="text-left py-2 px-3">{t('admin:customerFinance.transactions.tableHeaders.account')}</th>
                  <th className="text-left py-2 px-3">{t('admin:customerFinance.transactions.tableHeaders.institution')}</th>
                  <th className="text-right py-2 px-3">{t('admin:customerFinance.transactions.tableHeaders.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const amount = Number(tx.amount || 0);
                  const isIncome = amount > 0;
                  return (
                    <tr key={tx.id} className="border-b border-border/50">
                      <td className="py-2 px-3">{format(new Date(tx.date), "dd/MM/yyyy", { locale: dateLocale })}</td>
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
