import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Plus, TrendingUp, Wallet, EyeOff, Trash2, DollarSign, CreditCard, Building2, Loader2, Receipt, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const ClientProfile = () => {
  const { t, i18n } = useTranslation(['consultant', 'common']);
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [financeDetail, setFinanceDetail] = useState<{
    summary: { cash: number; investments: number; debt: number; netWorth: number };
    connections: any[];
    accounts: any[];
    investments: any[];
    breakdown: any[];
    cards: any[];
    transactions: any[];
  } | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const { toast } = useToast();

  // Get investment type label from translations
  const getInvestmentTypeLabel = (type: string) => {
    return t(`consultant:clientProfile.investmentTypes.${type}`, { defaultValue: type });
  };

  useEffect(() => {
    if (!id) return;

    const fetchClient = async () => {
      try {
        setLoading(true);
        const data = await consultantApi.getClient(id);
        setClientData(data);
        setError(null);
      } catch (err: any) {
        const errorMessage = err?.error || t('consultant:clientProfile.loadError');
        console.error("Error fetching client:", err);

        // Check if it's a relationship/permission error - show notification and go back
        if (
          errorMessage.includes("No active relationship") ||
          errorMessage.includes("pending or revoked") ||
          errorMessage.includes("Invitation may be pending") ||
          err?.statusCode === 403
        ) {
          toast({
            title: t('consultant:clientProfile.accessDenied'),
            description: t('consultant:clientProfile.accessDeniedDesc'),
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

  // Fetch full wallet/finance detail when client has wallet shared (same data as admin users/:id/finance)
  useEffect(() => {
    if (!id || !clientData) return;
    const walletShared = clientData.walletShared !== false && clientData.financial != null;
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
    return () => { cancelled = true; };
  }, [id, clientData]);

  const formatCurrency = (val: number | string) =>
    `R$ ${Number(val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;

    try {
      const result = await consultantApi.addClientNote(id, newNote);
      setClientData((prev: any) => ({
        ...prev,
        notes: [result.note, ...(prev?.notes || [])],
      }));
      setNewNote("");
      toast({
        title: t('common:success'),
        description: t('consultant:clientProfile.notes.addSuccess'),
        variant: "success"
      });
    } catch (err: any) {
      console.error("Error adding note:", err);
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:clientProfile.notes.error'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteNoteClick = (noteId: string) => {
    setNoteToDelete(noteId);
  };

  const handleConfirmDeleteNote = async () => {
    if (!id || !noteToDelete) return;

    try {
      setDeletingNoteId(noteToDelete);
      await consultantApi.deleteClientNote(id, noteToDelete);
      setClientData((prev: any) => ({
        ...prev,
        notes: (prev?.notes || []).filter((n: any) => n.id !== noteToDelete),
      }));
      toast({
        title: t('common:success'),
        description: t('consultant:clientProfile.notes.deleteSuccess'),
        variant: "success"
      });
      setNoteToDelete(null);
    } catch (err: any) {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:clientProfile.notes.error'),
        variant: "destructive",
      });
    } finally {
      setDeletingNoteId(null);
    }
  };

  const showContent = !loading && !error && clientData;
  const client = clientData?.client;
  const financial = clientData?.financial;
  const notes = clientData?.notes ?? [];
  const reports = clientData?.reports ?? [];
  const walletShared = clientData?.walletShared;
  const canViewWallet = walletShared !== false && financial != null;

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/consultant/clients" className="shrink-0">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            {showContent ? (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words tracking-tight">{client!.name}</h1>
                <p className="text-sm text-muted-foreground mt-1 truncate sm:break-all" title={client!.email}>
                  {client!.email}
                </p>
              </>
            ) : (
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {loading ? t('common:loading') : (error || t('consultant:clientProfile.notFound'))}
              </h1>
            )}
          </div>
        </div>
      </div>

      {/* Wallet sharing disabled notice */}
      {showContent && !canViewWallet && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 min-w-0">
          <EyeOff className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium break-words min-w-0">
            {t('consultant:clientProfile.connection.notConnected')}
          </p>
        </div>
      )}

      {/* KPI Cards - only when wallet is shared */}
      {showContent && canViewWallet && financial && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <div className="rounded-xl border-2 border-blue-500/70 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-all min-h-[88px] flex flex-col justify-center">
          <ProfessionalKpiCard
            title={t('consultant:clientProfile.kpis.netWorth')}
            value={`R$ ${financial.netWorth.toLocaleString("pt-BR")}`}
            change=""
            changeType="neutral"
            icon={TrendingUp}
            iconClassName="text-blue-500"
            subtitle=""
          />
        </div>
        <div className="rounded-xl border-2 border-emerald-500/70 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-all min-h-[88px] flex flex-col justify-center">
          <ProfessionalKpiCard
            title={t('consultant:clientProfile.kpis.cash')}
            value={`R$ ${financial.cash.toLocaleString("pt-BR")}`}
            change=""
            changeType="neutral"
            icon={DollarSign}
            iconClassName="text-emerald-500"
            subtitle=""
          />
        </div>
        <div className="rounded-xl border-2 border-violet-500/70 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-all min-h-[88px] flex flex-col justify-center">
          <ProfessionalKpiCard
            title={t('consultant:clientProfile.kpis.investments')}
            value={`R$ ${financial.investments.toLocaleString("pt-BR")}`}
            change=""
            changeType="neutral"
            icon={TrendingUp}
            iconClassName="text-violet-500"
            subtitle=""
          />
        </div>
        <div className="rounded-xl border-2 border-amber-500/70 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-amber-500/5 transition-all min-h-[88px] flex flex-col justify-center">
          <ProfessionalKpiCard
            title={t('consultant:clientProfile.kpis.debts')}
            value={`R$ ${financial.debt.toLocaleString("pt-BR")}`}
            change=""
            changeType="neutral"
            icon={CreditCard}
            iconClassName="text-amber-500"
            subtitle=""
          />
        </div>
      </div>
      )}

      {/* Tabs: on mobile, content left + vertical icon tabs fixed on right */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
        <div className="flex flex-row gap-3 md:flex-col md:gap-4">
          {/* Content area (left on mobile with right padding for fixed strip; below tabs on desktop) */}
          <div className="flex-1 min-w-0 overflow-x-hidden order-1 md:order-2">
            <TabsContent value="account" className="space-y-4 min-w-0 mt-0 md:mt-2">
          {!showContent ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              {loading ? t('common:loading') : (error || t('consultant:clientProfile.notFound'))}
            </div>
          ) : (
          <>
          <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
            <h2 className="text-sm font-semibold text-foreground mb-1">{t('consultant:clientProfile.financialSummary')}</h2>
            {canViewWallet ? (
              <p className="text-sm text-muted-foreground">
                {t('consultant:clientProfile.financialSummaryDesc')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('consultant:clientProfile.connection.notConnected')}
              </p>
            )}
          </div>

          {canViewWallet && (
            <>
              {financeLoading && (
                <div className="space-y-4">
                  <div className="rounded-xl border-2 border-violet-500/70 bg-card p-5 space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="rounded-xl border-2 border-emerald-500/70 bg-card p-5 space-y-3">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              )}
              {!financeLoading && financeDetail && (
                <>
                  <div className="rounded-xl border-2 border-violet-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-shadow min-w-0">
                    <h2 className="text-sm font-semibold text-foreground">{t('consultant:clientProfile.openFinanceConnections')}</h2>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">{t('consultant:clientProfile.institutionsConnected', { count: financeDetail.connections.length })}</p>
                    {financeDetail.connections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Link2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium text-foreground">{t('consultant:clientProfile.noConnections')}</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{t('consultant:clientProfile.noConnectionsDesc')}</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3 min-w-0">
                        {financeDetail.connections.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 min-w-0 max-w-full overflow-hidden"
                          >
                            {c.institution_logo ? (
                              <img src={c.institution_logo} alt="" className="h-6 w-6 object-contain" />
                            ) : (
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium truncate">{c.institution_name || t('consultant:clientProfile.institution')}</span>
                            <span className="text-xs text-muted-foreground">({c.status})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow min-w-0">
                    <h2 className="text-sm font-semibold text-foreground">{t('consultant:clientProfile.bankAccounts')}</h2>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">{t('consultant:clientProfile.accountsSynced', { count: financeDetail.accounts.length })}</p>
                    {financeDetail.accounts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Wallet className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium text-foreground">{t('consultant:clientProfile.noAccounts')}</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{t('consultant:clientProfile.noAccountsDesc')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 md:hidden">
                          {financeDetail.accounts.map((a) => (
                            <div key={a.id} className="rounded-lg border border-border p-3 space-y-1.5 min-w-0">
                              <p className="text-sm font-medium break-words">{a.name}</p>
                              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t('consultant:clientProfile.type')}:</span> {a.type || "-"}</p>
                              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t('consultant:clientProfile.institution')}:</span> {a.institution_name || "-"}</p>
                              <p className="text-sm font-medium text-right">{formatCurrency(a.current_balance)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="hidden md:block overflow-x-auto min-w-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 px-3">{t('consultant:clientProfile.name')}</th>
                                <th className="text-left py-2 px-3">{t('consultant:clientProfile.type')}</th>
                                <th className="text-left py-2 px-3">{t('consultant:clientProfile.institution')}</th>
                                <th className="text-right py-2 px-3">{t('consultant:clientProfile.balance')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {financeDetail.accounts.map((a) => (
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
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          </>
          )}
        </TabsContent>

        <TabsContent value="transaction" className="space-y-4 min-w-0 mt-0 md:mt-2">
          {!showContent ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              {loading ? t('common:loading') : (error || t('consultant:clientProfile.notFound'))}
            </div>
          ) : canViewWallet && financeDetail ? (
            <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{t('consultant:clientProfile.recentTransactions')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('consultant:clientProfile.lastTransactions', { count: financeDetail.transactions.length })}</p>
                </div>
              </div>
              {financeDetail.transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">{t('consultant:clientProfile.noTransactions')}</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">{t('consultant:clientProfile.noTransactionsDesc')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto md:hidden min-w-0 pr-1 pb-1 transactions-scrollbar">
                    {financeDetail.transactions.map((tx) => {
                      const amount = Number(tx.amount || 0);
                      const isIncome = amount > 0;
                      return (
                        <div key={tx.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 min-w-0 transition-colors hover:bg-muted/30">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs text-muted-foreground shrink-0">{format(new Date(tx.date), "dd/MM/yyyy", { locale: dateLocale })}</p>
                            <span className={`text-sm font-medium shrink-0 tabular-nums ${isIncome ? "text-success" : "text-destructive"}`}>
                              {isIncome ? "+" : ""}{formatCurrency(amount)}
                            </span>
                          </div>
                          <p className="text-sm font-medium break-words">{tx.description || tx.merchant || "-"}</p>
                          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t('consultant:clientProfile.account')}:</span> {tx.account_name || "-"}</p>
                          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t('consultant:clientProfile.institution')}:</span> {tx.institution_name || "-"}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[400px] min-w-0 pr-1 pb-1 transactions-scrollbar rounded-b-lg">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="sticky top-0 z-10 bg-card border-b border-border">
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('consultant:clientProfile.date')}</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('consultant:clientProfile.description')}</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('consultant:clientProfile.account')}</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('consultant:clientProfile.institution')}</th>
                          <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('consultant:clientProfile.amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeDetail.transactions.map((tx) => {
                          const amount = Number(tx.amount || 0);
                          const isIncome = amount > 0;
                          return (
                            <tr key={tx.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                              <td className="py-2.5 px-3 text-muted-foreground">{format(new Date(tx.date), "dd/MM/yyyy", { locale: dateLocale })}</td>
                              <td className="py-2.5 px-3 font-medium">{tx.description || tx.merchant || "-"}</td>
                              <td className="py-2.5 px-3">{tx.account_name || "-"}</td>
                              <td className="py-2.5 px-3">{tx.institution_name || "-"}</td>
                              <td
                                className={`py-2.5 px-3 text-right font-medium tabular-nums ${isIncome ? "text-success" : "text-destructive"}`}
                              >
                                {isIncome ? "+" : ""}{formatCurrency(amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">{t('consultant:clientProfile.connection.noData')}</p>
          )}
        </TabsContent>

        <TabsContent value="credit_card" className="space-y-4 min-w-0 mt-0 md:mt-2">
          {!showContent ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              {loading ? t('common:loading') : (error || t('consultant:clientProfile.notFound'))}
            </div>
          ) : canViewWallet && financeDetail ? (
            <div className="rounded-xl border-2 border-amber-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-amber-500/5 transition-shadow min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{t('consultant:clientProfile.creditCards')}</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{t('consultant:clientProfile.cardsCount', { count: financeDetail.cards.length })}</p>
              {financeDetail.cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">{t('consultant:clientProfile.noCards')}</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">{t('consultant:clientProfile.noCardsDesc')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {financeDetail.cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-border min-w-0 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                        <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-sm font-medium break-words">
                            {card.brand || t('consultant:clientProfile.card')} ****{card.last4 || "****"}
                          </p>
                          <p className="text-xs text-muted-foreground break-words">{card.institution_name || "-"}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-destructive">{formatCurrency(card.openDebt)}</p>
                        <p className="text-xs text-muted-foreground">{t('consultant:clientProfile.openBill')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">{t('consultant:clientProfile.connection.noData')}</p>
          )}
        </TabsContent>

        <TabsContent value="investments" className="space-y-4 mt-0 md:mt-2">
          {!showContent ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              {loading ? t('common:loading') : (error || t('consultant:clientProfile.notFound'))}
            </div>
          ) : canViewWallet && financeDetail ? (
            <>
              <div className="rounded-xl border-2 border-violet-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-shadow min-w-0">
                <h2 className="text-sm font-semibold text-foreground">{t('consultant:clientProfile.investmentsTitle')}</h2>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{t('consultant:clientProfile.positionsCount', { count: financeDetail.investments.length })}</p>
                {financeDetail.investments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-foreground">{t('consultant:clientProfile.noInvestments')}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">{t('consultant:clientProfile.noInvestmentsDesc')}</p>
                  </div>
                ) : (
                  <div className="space-y-4 min-w-0">
                    {financeDetail.breakdown.length > 0 && (
                      <div className="space-y-2 min-w-0">
                        <h4 className="text-sm font-semibold">{t('consultant:clientProfile.allocationByType')}</h4>
                        {financeDetail.breakdown.map((b) => {
                          const pct = financeDetail.summary.investments > 0 ? (b.total / financeDetail.summary.investments) * 100 : 0;
                          return (
                            <div key={b.type} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
                              <span className="text-sm sm:w-20 shrink-0">{getInvestmentTypeLabel(b.type)}</span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-0">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium sm:w-28 text-right shrink-0">{formatCurrency(b.total)}</span>
                              <span className="text-xs text-muted-foreground sm:w-12 shrink-0">{pct.toFixed(1)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="space-y-3 md:hidden">
                      {financeDetail.investments.map((inv) => (
                        <div key={inv.id} className="rounded-lg border border-border p-3 space-y-1.5 min-w-0">
                          <p className="text-sm font-medium break-words">{inv.name || "-"}</p>
                          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t('consultant:clientProfile.type')}:</span> {getInvestmentTypeLabel(inv.type) || "-"}</p>
                          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t('consultant:clientProfile.institution')}:</span> {inv.institution_name || "-"}</p>
                          <div className="flex justify-between text-sm pt-1">
                            <span className="text-muted-foreground">{t('consultant:clientProfile.quantity')}: {Number(inv.quantity || 0).toLocaleString("pt-BR")}</span>
                            <span className="font-medium">{formatCurrency(inv.current_value)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto min-w-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3">{t('consultant:clientProfile.type')}</th>
                            <th className="text-left py-2 px-3">{t('consultant:clientProfile.name')}</th>
                            <th className="text-left py-2 px-3">{t('consultant:clientProfile.institution')}</th>
                            <th className="text-right py-2 px-3">{t('consultant:clientProfile.quantity')}</th>
                            <th className="text-right py-2 px-3">{t('consultant:clientProfile.value')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeDetail.investments.map((inv) => (
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
              </div>
              <div className="rounded-xl border-2 border-violet-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-shadow min-w-0">
                <h2 className="text-sm font-semibold text-foreground">{t('consultant:clientProfile.portfolioTitle')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('consultant:clientProfile.portfolioDesc')}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-xl border-2 border-violet-500/70 bg-card p-5 shadow-sm min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{t('consultant:clientProfile.portfolioTitle')}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t('consultant:clientProfile.connection.noData')}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 min-w-0 mt-0 md:mt-2">
          <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
            <h2 className="text-sm font-semibold text-foreground mb-4">{t('consultant:clientProfile.reportsGenerated')}</h2>
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">{t('consultant:clientProfile.noReports')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('consultant:clientProfile.noReportsDesc')}</p>
                </div>
              ) : (
                reports.map((report: any) => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-border min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate sm:break-words">
                        {report.type} - {report.generatedAt}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 truncate sm:break-words">
                        {t('consultant:clientProfile.generatedAt')} {report.generatedAt}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {report.downloadUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={report.downloadUrl} download>
                            {t('consultant:clientProfile.download')}
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          {t('consultant:clientProfile.processing')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4 min-w-0 mt-0 md:mt-2">
          <div className="rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-foreground">{t('consultant:clientProfile.notes.title')}</h2>
              <Button size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                {t('consultant:clientProfile.notes.addButton')}
              </Button>
            </div>
            <div className="space-y-4 min-w-0">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border border-border group min-w-0"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0">{note.date}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteNoteClick(note.id)}
                      disabled={deletingNoteId === note.id}
                      title={t('consultant:clientProfile.notes.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-foreground break-words min-w-0">{note.content}</p>
                </div>
              ))}
              <div className="p-4 rounded-lg border-2 border-dashed border-border min-w-0">
                <Textarea
                  placeholder={t('consultant:clientProfile.notes.addPlaceholder')}
                  className="min-h-[100px] resize-none w-full min-w-0 max-w-full"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <Button className="mt-3" size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                  {t('consultant:clientProfile.notes.saveButton')}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
          </div>

          {/* Tab strip: portaled to body; height fits four icons only, vertically centered in viewport */}
          {typeof document !== "undefined" &&
            createPortal(
              <div
                className="w-14 flex flex-col items-center gap-3 py-4 bg-transparent lg:hidden"
                style={{
                  position: "fixed",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2147483647,
                  isolation: "isolate",
                  boxShadow: "-4px 0 12px rgba(0,0,0,0.25)",
                }}
              >
                <TabsList className="flex flex-col h-auto w-full shrink-0 gap-3 p-2 rounded-xl bg-sidebar border border-sidebar-border text-sidebar-foreground">
                  <TabsTrigger
                    value="account"
                    className="flex items-center justify-center h-12 w-12 min-h-[44px] rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                    title={t('consultant:clientProfile.tabs.accounts')}
                  >
                    <Wallet className="h-5 w-5 shrink-0" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="transaction"
                    className="flex items-center justify-center h-12 w-12 min-h-[44px] rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                    title={t('consultant:clientProfile.tabs.transactions')}
                  >
                    <Receipt className="h-5 w-5 shrink-0" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="credit_card"
                    className="flex items-center justify-center h-12 w-12 min-h-[44px] rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                    title={t('consultant:clientProfile.tabs.cards')}
                  >
                    <CreditCard className="h-5 w-5 shrink-0" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="investments"
                    className="flex items-center justify-center h-12 w-12 min-h-[44px] rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                    title={t('consultant:clientProfile.tabs.investments')}
                  >
                    <TrendingUp className="h-5 w-5 shrink-0" />
                  </TabsTrigger>
                </TabsList>
              </div>,
              document.body
            )}
          {/* Desktop: inline tab strip above content - matches left sidebar style */}
          <div className="hidden lg:flex flex-row w-auto shrink-0 gap-1 p-0 order-2 md:order-1">
            <TabsList className="flex flex-row h-auto w-auto inline-flex gap-1 p-1.5 rounded-xl bg-sidebar border border-sidebar-border text-sidebar-foreground">
              <TabsTrigger
                value="account"
                className="flex-none flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                title={t('consultant:clientProfile.tabs.accounts')}
              >
                <Wallet className="h-4 w-4 shrink-0" />
                {t('consultant:clientProfile.tabs.accounts')}
              </TabsTrigger>
              <TabsTrigger
                value="transaction"
                className="flex-none flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                title={t('consultant:clientProfile.tabs.transactions')}
              >
                <Receipt className="h-4 w-4 shrink-0" />
                {t('consultant:clientProfile.tabs.transactions')}
              </TabsTrigger>
              <TabsTrigger
                value="credit_card"
                className="flex-none flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                title={t('consultant:clientProfile.tabs.cards')}
              >
                <CreditCard className="h-4 w-4 shrink-0" />
                {t('consultant:clientProfile.tabs.cards')}
              </TabsTrigger>
              <TabsTrigger
                value="investments"
                className="flex-none flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                title={t('consultant:clientProfile.tabs.investments')}
              >
                <TrendingUp className="h-4 w-4 shrink-0" />
                {t('consultant:clientProfile.tabs.investments')}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </Tabs>

      {/* Delete Note Confirmation Dialog */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('consultant:clientProfile.notes.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('consultant:clientProfile.notes.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingNoteId}>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDeleteNote();
              }}
              disabled={!!deletingNoteId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingNoteId ? t('consultant:clientProfile.notes.deleting') : t('consultant:clientProfile.notes.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientProfile;
