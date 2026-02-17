import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  Wallet,
  EyeOff,
  DollarSign,
  CreditCard,
  Building2,
  Receipt,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import ChartCard from "@/components/dashboard/ChartCard";

const TABS = [
  { id: "account", icon: Wallet },
  { id: "transaction", icon: Receipt },
  { id: "credit_card", icon: CreditCard },
  { id: "investments", icon: TrendingUp },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_LABEL_KEY: Record<TabId, string> = {
  account: "accounts",
  transaction: "transactions",
  credit_card: "cards",
  investments: "investments",
};

const ClientProfile = () => {
  const { t, i18n } = useTranslation(["consultant", "common"]);
  const dateLocale =
    i18n.language === "pt-BR" || i18n.language === "pt" ? ptBR : enUS;
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financeDetail, setFinanceDetail] = useState<{
    summary: {
      cash: number;
      investments: number;
      debt: number;
      netWorth: number;
    };
    connections: any[];
    accounts: any[];
    investments: any[];
    breakdown: any[];
    cards: any[];
    transactions: any[];
  } | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const getInvestmentTypeLabel = (type: string) =>
    t(`consultant:clientProfile.investmentTypes.${type}`, {
      defaultValue: type,
    });

  useEffect(() => {
    if (!id) return;
    const fetchClient = async () => {
      try {
        setLoading(true);
        const data = await consultantApi.getClient(id);
        setClientData(data);
        setError(null);
      } catch (err: any) {
        const errorMessage =
          err?.error || t("consultant:clientProfile.loadError");
        if (
          errorMessage.includes("No active relationship") ||
          errorMessage.includes("pending or revoked") ||
          errorMessage.includes("Invitation may be pending") ||
          err?.statusCode === 403
        ) {
          toast({
            title: t("consultant:clientProfile.accessDenied"),
            description: t("consultant:clientProfile.accessDeniedDesc"),
            variant: "warning",
          });
          navigate("/consultant/clients", { replace: true });
          return;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id, navigate, toast, t]);

  useEffect(() => {
    if (!id || !clientData) return;
    const walletShared =
      clientData.walletShared !== false && clientData.financial != null;
    if (!walletShared) {
      setFinanceDetail(null);
      return;
    }
    let cancelled = false;
    const fetchFinance = async () => {
      try {
        setFinanceLoading(true);
        const res = await consultantApi.getClientFinance(id);
        if (!cancelled) {
          setFinanceDetail({
            summary: res.summary,
            connections: res.connections || [],
            accounts: res.accounts || [],
            investments: res.investments || [],
            breakdown: res.breakdown || [],
            cards: res.cards || [],
            transactions: res.transactions || [],
          });
        }
      } catch {
        if (!cancelled) setFinanceDetail(null);
      } finally {
        if (!cancelled) setFinanceLoading(false);
      }
    };
    fetchFinance();
    return () => {
      cancelled = true;
    };
  }, [id, clientData]);

  const showContent = !loading && !error && clientData;
  const client = clientData?.client;
  const financial = clientData?.financial;
  const walletShared = clientData?.walletShared;
  const canViewWallet = walletShared !== false && financial != null;

  // --- Render ---

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/consultant/clients" className="shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          {showContent ? (
            <>
              <h1 className="text-lg font-bold text-foreground truncate">
                {client!.name}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {client!.email}
              </p>
            </>
          ) : (
            <h1 className="text-lg font-bold text-foreground">
              {loading
                ? t("common:loading")
                : error || t("consultant:clientProfile.notFound")}
            </h1>
          )}
        </div>
      </div>

      {/* Wallet sharing disabled notice */}
      {showContent && !canViewWallet && (
        <div className="chart-card !p-4 flex items-center gap-3 border-amber-500/40">
          <EyeOff className="h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-400">
            {t("consultant:clientProfile.connection.notConnected")}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      {showContent && canViewWallet && financial && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              title: t("consultant:clientProfile.kpis.netWorth"),
              value: formatCurrency(Number(financial.netWorth || 0)),
              icon: TrendingUp,
              wm: TrendingUp,
            },
            {
              title: t("consultant:clientProfile.kpis.cash"),
              value: formatCurrency(Number(financial.cash || 0)),
              icon: DollarSign,
              wm: DollarSign,
            },
            {
              title: t("consultant:clientProfile.kpis.investments"),
              value: formatCurrency(Number(financial.investments || 0)),
              icon: TrendingUp,
              wm: Wallet,
            },
            {
              title: t("consultant:clientProfile.kpis.debts"),
              value: formatCurrency(Number(financial.debt || 0)),
              icon: CreditCard,
              wm: CreditCard,
            },
          ].map((kpi) => (
            <div key={kpi.title} className="kpi-card relative overflow-hidden">
              <kpi.wm className="absolute -bottom-3 -right-3 h-24 w-24 text-muted-foreground/[0.06] pointer-events-none" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {kpi.title}
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight leading-none relative z-10">
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">
                {t(`consultant:clientProfile.tabs.${TAB_LABEL_KEY[tab.id]}` as any)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "account" && (
        <div className="space-y-4 min-w-0">
          {!showContent ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              {loading
                ? t("common:loading")
                : error || t("consultant:clientProfile.notFound")}
            </div>
          ) : (
            <>
              <ChartCard
                title={t("consultant:clientProfile.financialSummary")}
                subtitle={
                  canViewWallet
                    ? t("consultant:clientProfile.financialSummaryDesc")
                    : t("consultant:clientProfile.connection.notConnected")
                }
              />

              {canViewWallet && (
                <>
                  {financeLoading && (
                    <div className="space-y-4">
                      <div className="chart-card space-y-3">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                      <div className="chart-card space-y-3">
                        <Skeleton className="h-5 w-56" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    </div>
                  )}
                  {!financeLoading && financeDetail && (
                    <>
                      {/* Open Finance Connections */}
                      <ChartCard
                        title={t(
                          "consultant:clientProfile.openFinanceConnections"
                        )}
                        subtitle={t(
                          "consultant:clientProfile.institutionsConnected",
                          { count: financeDetail.connections.length }
                        )}
                      >
                        {financeDetail.connections.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Link2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                            <p className="text-sm font-medium text-foreground">
                              {t("consultant:clientProfile.noConnections")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                              {t("consultant:clientProfile.noConnectionsDesc")}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {financeDetail.connections.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-white/20"
                              >
                                {c.institution_logo ? (
                                  <img
                                    src={c.institution_logo}
                                    alt=""
                                    className="h-5 w-5 object-contain"
                                  />
                                ) : (
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="text-sm font-medium truncate">
                                  {c.institution_name ||
                                    t("consultant:clientProfile.institution")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  (
                                  {t(`common:status.${c.status}`, {
                                    defaultValue: c.status,
                                  })}
                                  )
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </ChartCard>

                      {/* Bank Accounts */}
                      <ChartCard
                        title={t("consultant:clientProfile.bankAccounts")}
                        subtitle={t(
                          "consultant:clientProfile.accountsSynced",
                          { count: financeDetail.accounts.length }
                        )}
                      >
                        {financeDetail.accounts.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Wallet className="h-10 w-10 text-muted-foreground/40 mb-3" />
                            <p className="text-sm font-medium text-foreground">
                              {t("consultant:clientProfile.noAccounts")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                              {t("consultant:clientProfile.noAccountsDesc")}
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Mobile cards */}
                            <div className="space-y-2 md:hidden">
                              {financeDetail.accounts.map((a) => (
                                <div
                                  key={a.id}
                                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/20 border border-border/50"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {a.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {a.institution_name || a.type || "-"}
                                    </p>
                                  </div>
                                  <span className="text-sm font-medium tabular-nums shrink-0">
                                    {formatCurrency(
                                      Number(a.current_balance || 0)
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-white/15">
                                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                                      {t("consultant:clientProfile.name")}
                                    </th>
                                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                                      {t("consultant:clientProfile.type")}
                                    </th>
                                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                                      {t(
                                        "consultant:clientProfile.institution"
                                      )}
                                    </th>
                                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                                      {t("consultant:clientProfile.balance")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {financeDetail.accounts.map((a) => (
                                    <tr
                                      key={a.id}
                                      className="border-b border-white/10 hover:bg-muted/20 transition-colors"
                                    >
                                      <td className="py-2.5 px-3 font-medium">
                                        {a.name}
                                      </td>
                                      <td className="py-2.5 px-3 text-muted-foreground">
                                        {a.type || "-"}
                                      </td>
                                      <td className="py-2.5 px-3 text-muted-foreground">
                                        {a.institution_name || "-"}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-medium tabular-nums">
                                        {formatCurrency(
                                          Number(a.current_balance || 0)
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </ChartCard>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "transaction" && (
        <div className="space-y-4 min-w-0">
          {!showContent ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              {loading
                ? t("common:loading")
                : error || t("consultant:clientProfile.notFound")}
            </div>
          ) : canViewWallet && financeDetail ? (
            <ChartCard
              title={t("consultant:clientProfile.recentTransactions")}
              subtitle={t("consultant:clientProfile.lastTransactions", {
                count: financeDetail.transactions.length,
              })}
            >
              {financeDetail.transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    {t("consultant:clientProfile.noTransactions")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {t("consultant:clientProfile.noTransactionsDesc")}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto md:hidden pr-1 transactions-scrollbar">
                    {financeDetail.transactions.map((tx) => {
                      const amount = Number(tx.amount || 0);
                      const isIncome = amount > 0;
                      return (
                        <div
                          key={tx.id}
                          className="p-3 rounded-lg bg-muted/20 border border-border/50"
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.date), "dd/MM/yyyy", {
                                locale: dateLocale,
                              })}
                            </p>
                            <span
                              className={cn(
                                "text-sm font-medium tabular-nums shrink-0",
                                isIncome
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              )}
                            >
                              {isIncome ? "+" : ""}
                              {formatCurrency(amount)}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {tx.description || tx.merchant || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {tx.account_name || "-"} &middot;{" "}
                            {tx.institution_name || "-"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[400px] transactions-scrollbar">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-white/15">
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">
                            {t("consultant:clientProfile.date")}
                          </th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">
                            {t("consultant:clientProfile.description")}
                          </th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">
                            {t("consultant:clientProfile.account")}
                          </th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">
                            {t("consultant:clientProfile.institution")}
                          </th>
                          <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">
                            {t("consultant:clientProfile.amount")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeDetail.transactions.map((tx) => {
                          const amount = Number(tx.amount || 0);
                          const isIncome = amount > 0;
                          return (
                            <tr
                              key={tx.id}
                              className="border-b border-white/10 hover:bg-muted/20 transition-colors"
                            >
                              <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                                {format(new Date(tx.date), "dd/MM/yyyy", {
                                  locale: dateLocale,
                                })}
                              </td>
                              <td className="py-2.5 px-3 font-medium">
                                {tx.description || tx.merchant || "-"}
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground">
                                {tx.account_name || "-"}
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground">
                                {tx.institution_name || "-"}
                              </td>
                              <td
                                className={cn(
                                  "py-2.5 px-3 text-right font-medium tabular-nums",
                                  isIncome
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                )}
                              >
                                {isIncome ? "+" : ""}
                                {formatCurrency(amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </ChartCard>
          ) : (
            <ChartCard>
              <p className="text-sm text-muted-foreground py-4">
                {t("consultant:clientProfile.connection.noData")}
              </p>
            </ChartCard>
          )}
        </div>
      )}

      {activeTab === "credit_card" && (
        <div className="space-y-4 min-w-0">
          {!showContent ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              {loading
                ? t("common:loading")
                : error || t("consultant:clientProfile.notFound")}
            </div>
          ) : canViewWallet && financeDetail ? (
            <ChartCard
              title={t("consultant:clientProfile.creditCards")}
              subtitle={t("consultant:clientProfile.cardsCount", {
                count: financeDetail.cards.length,
              })}
            >
              {financeDetail.cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CreditCard className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    {t("consultant:clientProfile.noCards")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {t("consultant:clientProfile.noCardsDesc")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {financeDetail.cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/20 border border-border/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {card.brand ||
                              t("consultant:clientProfile.card")}{" "}
                            ****{card.last4 || "****"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {card.institution_name || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-red-400 tabular-nums">
                          {formatCurrency(Number(card.openDebt || 0))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("consultant:clientProfile.openBill")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          ) : (
            <ChartCard>
              <p className="text-sm text-muted-foreground py-4">
                {t("consultant:clientProfile.connection.noData")}
              </p>
            </ChartCard>
          )}
        </div>
      )}

      {activeTab === "investments" && (
        <div className="space-y-4 min-w-0">
          {!showContent ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              {loading
                ? t("common:loading")
                : error || t("consultant:clientProfile.notFound")}
            </div>
          ) : canViewWallet && financeDetail ? (
            <ChartCard
              title={t("consultant:clientProfile.investmentsTitle")}
              subtitle={t("consultant:clientProfile.positionsCount", {
                count: financeDetail.investments.length,
              })}
            >
              {financeDetail.investments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    {t("consultant:clientProfile.noInvestments")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {t("consultant:clientProfile.noInvestmentsDesc")}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Allocation breakdown */}
                  {financeDetail.breakdown.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("consultant:clientProfile.allocationByType")}
                      </h4>
                      {financeDetail.breakdown.map((b) => {
                        const pct =
                          financeDetail.summary.investments > 0
                            ? (b.total / financeDetail.summary.investments) *
                              100
                            : 0;
                        return (
                          <div
                            key={b.type}
                            className="flex items-center gap-3"
                          >
                            <span className="text-sm w-20 shrink-0 truncate">
                              {getInvestmentTypeLabel(b.type)}
                            </span>
                            <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-28 text-right shrink-0 tabular-nums">
                              {formatCurrency(Number(b.total || 0))}
                            </span>
                            <span className="text-xs text-muted-foreground w-12 shrink-0 tabular-nums">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Mobile cards */}
                  <div className="space-y-2 md:hidden">
                    {financeDetail.investments.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 rounded-lg bg-muted/20 border border-border/50"
                      >
                        <p className="text-sm font-medium truncate">
                          {inv.name || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {getInvestmentTypeLabel(inv.type)} &middot;{" "}
                          {inv.institution_name || "-"}
                        </p>
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-muted-foreground tabular-nums">
                            {t("consultant:clientProfile.quantity")}:{" "}
                            {Number(inv.quantity || 0).toLocaleString("pt-BR")}
                          </span>
                          <span className="font-medium tabular-nums">
                            {formatCurrency(Number(inv.current_value || 0))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/15">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                            {t("consultant:clientProfile.type")}
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                            {t("consultant:clientProfile.name")}
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                            {t("consultant:clientProfile.institution")}
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                            {t("consultant:clientProfile.quantity")}
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                            {t("consultant:clientProfile.value")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeDetail.investments.map((inv) => (
                          <tr
                            key={inv.id}
                            className="border-b border-white/10 hover:bg-muted/20 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {getInvestmentTypeLabel(inv.type) || "-"}
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              {inv.name || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {inv.institution_name || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums">
                              {Number(inv.quantity || 0).toLocaleString(
                                "pt-BR"
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium tabular-nums">
                              {formatCurrency(
                                Number(inv.current_value || 0)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </ChartCard>
          ) : (
            <ChartCard
              title={t("consultant:clientProfile.portfolioTitle")}
              subtitle={t("consultant:clientProfile.connection.noData")}
            />
          )}
        </div>
      )}

    </div>
  );
};

export default ClientProfile;
