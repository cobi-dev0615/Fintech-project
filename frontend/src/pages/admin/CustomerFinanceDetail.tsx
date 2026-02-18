import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
  Building2,
  Link2,
  Receipt,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

interface FinanceData {
  user: { id: string; name: string; email: string };
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
}

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

const CustomerFinanceDetail = () => {
  const { t, i18n } = useTranslation(["admin", "common"]);
  const { formatCurrency } = useCurrency();
  const dateLocale =
    i18n.language === "pt-BR" || i18n.language === "pt" ? ptBR : enUS;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("account");

  const getTypeLabel = (type: string) =>
    t(`admin:customerFinance.investmentTypes.${type}`, {
      defaultValue: type,
    });

  // ── Card visual helpers ──
  const getBrandClass = (brand: string) => {
    const b = (brand || "").toUpperCase();
    if (b.includes("VISA")) return "brand-visa";
    if (b.includes("MASTER")) return "brand-mastercard";
    if (b.includes("ELO")) return "brand-elo";
    if (b.includes("AMEX") || b.includes("AMERICAN")) return "brand-amex";
    if (b.includes("HIPER")) return "brand-hipercard";
    return "brand-default";
  };

  const getCardNumber = (card: any) => {
    const last4 = card.last4 || "0000";
    const brand = (card.brand || "").toUpperCase();
    let d1 = 4;
    if (brand.includes("MASTER")) d1 = 5;
    else if (brand.includes("AMEX") || brand.includes("AMERICAN")) d1 = 3;
    else if (brand.includes("ELO") || brand.includes("HIPER")) d1 = 6;
    const seed = card.id || last4;
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
    }
    const first = [d1];
    for (let i = 0; i < 3; i++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      first.push(h % 10);
    }
    return `${first.join("")} **** **** ${last4}`;
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
        setError(
          err?.error || t("admin:customerFinance.errorLoading"),
        );
        toast({
          title: t("common:error"),
          description:
            err?.error || t("admin:customerFinance.errorLoading"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, toast]);

  const showContent = !loading && !error && data;

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/admin/users" className="shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          {showContent ? (
            <>
              <h1 className="text-lg font-bold text-foreground truncate">
                {data.user.name}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {data.user.email}
              </p>
            </>
          ) : (
            <h1 className="text-lg font-bold text-foreground">
              {loading
                ? t("common:loading")
                : error || t("admin:customerFinance.dataNotFound")}
            </h1>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[100px] rounded-xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
          <div className="chart-card space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {showContent && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              title: t("admin:customerFinance.kpis.netWorth"),
              value: formatCurrency(Number(data.summary.netWorth || 0)),
              icon: TrendingUp,
              wm: TrendingUp,
            },
            {
              title: t("admin:customerFinance.kpis.cash"),
              value: formatCurrency(Number(data.summary.cash || 0)),
              icon: DollarSign,
              wm: DollarSign,
            },
            {
              title: t("admin:customerFinance.kpis.investments"),
              value: formatCurrency(Number(data.summary.investments || 0)),
              icon: TrendingUp,
              wm: Wallet,
            },
            {
              title: t("admin:customerFinance.kpis.debt"),
              value: formatCurrency(Number(data.summary.debt || 0)),
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
      {showContent && (
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
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">
                  {t(
                    `admin:customerFinance.tabs.${TAB_LABEL_KEY[tab.id]}` as any,
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ═══ Accounts Tab ═══ */}
      {showContent && activeTab === "account" && (
        <div className="space-y-4 min-w-0">
          {/* Connections */}
          <ChartCard
            title={t("admin:customerFinance.connections.title")}
            subtitle={t("admin:customerFinance.connections.subtitle", {
              count: data.connections.length,
            })}
          >
            {data.connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Link2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {t("admin:customerFinance.connections.empty")}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.connections.map((c) => (
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
                        t("admin:customerFinance.connections.institution")}
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
            title={t("admin:customerFinance.accounts.title")}
            subtitle={t("admin:customerFinance.accounts.subtitle", {
              count: data.accounts.length,
            })}
          >
            {data.accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Wallet className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {t("admin:customerFinance.accounts.empty")}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-2 md:hidden">
                  {data.accounts.map((a) => (
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
                        {formatCurrency(Number(a.current_balance || 0))}
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
                          {t(
                            "admin:customerFinance.accounts.tableHeaders.name",
                          )}
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.accounts.tableHeaders.type",
                          )}
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.accounts.tableHeaders.institution",
                          )}
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.accounts.tableHeaders.balance",
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.accounts.map((a) => (
                        <tr
                          key={a.id}
                          className="border-b border-white/10 hover:bg-muted/20 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-medium">{a.name}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {a.type || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {a.institution_name || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium tabular-nums">
                            {formatCurrency(Number(a.current_balance || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </ChartCard>
        </div>
      )}

      {/* ═══ Transactions Tab ═══ */}
      {showContent && activeTab === "transaction" && (
        <div className="space-y-4 min-w-0">
          <ChartCard
            title={t("admin:customerFinance.transactions.title")}
            subtitle={t("admin:customerFinance.transactions.subtitle", {
              count: data.transactions.length,
            })}
          >
            {data.transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {t("admin:customerFinance.transactions.empty")}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto md:hidden pr-1 transactions-scrollbar">
                  {data.transactions.map((tx) => {
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
                              isIncome ? "text-emerald-400" : "text-red-400",
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
                          {t(
                            "admin:customerFinance.transactions.tableHeaders.date",
                          )}
                        </th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.transactions.tableHeaders.description",
                          )}
                        </th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.transactions.tableHeaders.account",
                          )}
                        </th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.transactions.tableHeaders.institution",
                          )}
                        </th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.transactions.tableHeaders.amount",
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((tx) => {
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
                                  : "text-red-400",
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
        </div>
      )}

      {/* ═══ Credit Cards Tab ═══ */}
      {showContent && activeTab === "credit_card" && (
        <div className="space-y-4 min-w-0">
          <ChartCard
            title={t("admin:customerFinance.cards.title")}
            subtitle={t("admin:customerFinance.cards.subtitle", {
              count: data.cards.length,
            })}
          >
            {data.cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CreditCard className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {t("admin:customerFinance.cards.empty")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.cards.map((card) => {
                  const brandUpper = (card.brand || "VISA").toUpperCase();
                  const holderName = data.user.name || "Card Holder";

                  return (
                    <div
                      key={card.id}
                      className="rounded-xl p-4 border border-white/[0.08] transition-colors hover:border-primary/30"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(8, 12, 20, 0.90) 0%, rgba(8, 12, 20, 0.85) 100%)",
                      }}
                    >
                      <div className="flex gap-4 sm:gap-5">
                        {/* Visual Credit Card */}
                        <div
                          className={`credit-card-visual ${getBrandClass(card.brand)} shrink-0 flex flex-col justify-between`}
                        >
                          <div className="flex items-start justify-between">
                            <Wifi className="h-4 w-4 opacity-70 rotate-90" />
                            <span className="text-[10px] font-bold tracking-wider opacity-90 italic">
                              {brandUpper}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] sm:text-xs tracking-[0.12em] opacity-95 leading-tight">
                            {getCardNumber(card)}
                          </div>
                          <div className="flex items-end justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-[7px] uppercase tracking-wider opacity-50">
                                CARD HOLDER
                              </p>
                              <p className="text-[9px] font-medium uppercase tracking-wide truncate">
                                {holderName}
                              </p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-[7px] uppercase tracking-wider opacity-50">
                                LAST 4
                              </p>
                              <p className="text-[9px] font-medium">
                                •••• {card.last4 || "****"}
                              </p>
                            </div>
                          </div>
                          <div className="absolute top-[38%] left-3.5 w-6 h-[18px] rounded-[3px] bg-amber-400/30 border border-amber-400/40" />
                        </div>

                        {/* Card Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-sm truncate">
                              {brandUpper}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              •••• {card.last4 || "****"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                            <div>
                              <p className="text-[11px] text-muted-foreground">
                                {t("admin:customerFinance.cards.openInvoice")}
                              </p>
                              <p className="text-sm font-semibold tabular-nums text-red-400">
                                {formatCurrency(Number(card.openDebt || 0))}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">
                                {t(
                                  "admin:customerFinance.accounts.tableHeaders.institution",
                                )}
                              </p>
                              <p className="text-sm font-medium truncate">
                                {card.institution_name || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">
                                {t(
                                  "admin:customerFinance.accounts.tableHeaders.name",
                                )}
                              </p>
                              <p className="text-sm font-medium truncate">
                                {holderName}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">
                                {t(
                                  "admin:customerFinance.accounts.tableHeaders.type",
                                )}
                              </p>
                              <p className="text-sm font-medium">
                                {t("admin:customerFinance.cards.card")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {/* ═══ Investments Tab ═══ */}
      {showContent && activeTab === "investments" && (
        <div className="space-y-4 min-w-0">
          <ChartCard
            title={t("admin:customerFinance.investments.title")}
            subtitle={t("admin:customerFinance.investments.subtitle", {
              count: data.investments.length,
            })}
          >
            {data.investments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {t("admin:customerFinance.investments.empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Allocation breakdown */}
                {data.breakdown.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t(
                        "admin:customerFinance.investments.allocationByType",
                      )}
                    </h4>
                    {data.breakdown.map((b) => {
                      const pct =
                        data.summary.investments > 0
                          ? (b.total / data.summary.investments) * 100
                          : 0;
                      return (
                        <div
                          key={b.type}
                          className="flex items-center gap-3"
                        >
                          <span className="text-sm w-20 shrink-0 truncate">
                            {getTypeLabel(b.type)}
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
                  {data.investments.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 rounded-lg bg-muted/20 border border-border/50"
                    >
                      <p className="text-sm font-medium truncate">
                        {inv.name || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {getTypeLabel(inv.type)} &middot;{" "}
                        {inv.institution_name || "-"}
                      </p>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-muted-foreground tabular-nums">
                          {t(
                            "admin:customerFinance.investments.tableHeaders.quantity",
                          )}
                          : {Number(inv.quantity || 0).toLocaleString(i18n.language?.startsWith("pt") ? "pt-BR" : "en-US")}
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
                          {t(
                            "admin:customerFinance.investments.tableHeaders.type",
                          )}
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.investments.tableHeaders.name",
                          )}
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.investments.tableHeaders.institution",
                          )}
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.investments.tableHeaders.quantity",
                          )}
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                          {t(
                            "admin:customerFinance.investments.tableHeaders.value",
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.investments.map((inv) => (
                        <tr
                          key={inv.id}
                          className="border-b border-white/10 hover:bg-muted/20 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {getTypeLabel(inv.type) || "-"}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {inv.name || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {inv.institution_name || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {Number(inv.quantity || 0).toLocaleString(
                              i18n.language?.startsWith("pt")
                                ? "pt-BR"
                                : "en-US",
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium tabular-nums">
                            {formatCurrency(
                              Number(inv.current_value || 0),
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
        </div>
      )}
    </div>
  );
};

export default CustomerFinanceDetail;
