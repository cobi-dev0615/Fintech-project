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

const ClientProfile = () => {
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

  useEffect(() => {
    if (!id) return;

    const fetchClient = async () => {
      try {
        setLoading(true);
        const data = await consultantApi.getClient(id);
        setClientData(data);
        setError(null);
      } catch (err: any) {
        const errorMessage = err?.error || "Erro ao carregar dados do cliente";
        console.error("Error fetching client:", err);
        
        // Check if it's a relationship/permission error - show notification and go back
        if (
          errorMessage.includes("No active relationship") ||
          errorMessage.includes("pending or revoked") ||
          errorMessage.includes("Invitation may be pending") ||
          err?.statusCode === 403
        ) {
          toast({
            title: "Acesso negado",
            description: "Não há relacionamento ativo com este cliente. O convite pode estar pendente ou revogado.",
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
  }, [id, navigate, toast]);

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
      toast({ title: "Sucesso", description: "Anotação adicionada", variant: "success" });
    } catch (err: any) {
      console.error("Error adding note:", err);
      toast({
        title: "Erro",
        description: err?.error || "Erro ao adicionar anotação",
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
      toast({ title: "Sucesso", description: "Anotação excluída", variant: "success" });
      setNoteToDelete(null);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao excluir anotação",
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
                {loading ? "Carregando..." : (error || "Cliente não encontrado")}
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
            O cliente desativou o compartilhamento da carteira. Você pode enviar mensagens e adicionar anotações, mas os dados financeiros não estão disponíveis.
          </p>
        </div>
      )}

      {/* KPI Cards - only when wallet is shared */}
      {showContent && canViewWallet && financial && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <div className="rounded-xl border-2 border-blue-500/70 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-all min-h-[88px] flex flex-col justify-center">
          <ProfessionalKpiCard title="Patrimônio Líquido" value={`R$ ${financial.netWorth.toLocaleString("pt-BR")}`} change="" changeType="neutral" icon={TrendingUp} iconClassName="text-blue-500" subtitle="" />
        </div>
        <div className="rounded-xl border-2 border-emerald-500/70 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-all min-h-[88px] flex flex-col justify-center">
          <ProfessionalKpiCard title="Caixa" value={`R$ ${financial.cash.toLocaleString("pt-BR")}`} change="" changeType="neutral" icon={DollarSign} iconClassName="text-emerald-500" subtitle="" />
        </div>
        <div className="rounded-xl border-2 border-violet-500/70 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-all min-h-[88px] flex flex-col justify-center">
          <ProfessionalKpiCard title="Investimentos" value={`R$ ${financial.investments.toLocaleString("pt-BR")}`} change="" changeType="neutral" icon={TrendingUp} iconClassName="text-violet-500" subtitle="" />
        </div>
        <div className="rounded-xl border-2 border-amber-500/70 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-amber-500/5 transition-all min-h-[88px] flex flex-col justify-center">
          <ProfessionalKpiCard title="Dívidas" value={`R$ ${financial.debt.toLocaleString("pt-BR")}`} change="" changeType="neutral" icon={CreditCard} iconClassName="text-amber-500" subtitle="" />
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
              {loading ? "Carregando..." : (error || "Cliente não encontrado")}
            </div>
          ) : (
          <>
          <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
            <h2 className="text-sm font-semibold text-foreground mb-1">Resumo Financeiro</h2>
            {canViewWallet ? (
              <p className="text-sm text-muted-foreground">
                Visão consolidada das finanças do cliente. Os dados são atualizados automaticamente através das conexões com instituições financeiras.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                O cliente desativou o compartilhamento da carteira. Os dados financeiros não estão disponíveis.
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
                    <h2 className="text-sm font-semibold text-foreground">Conexões Open Finance</h2>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">{financeDetail.connections.length} instituição(ões) conectada(s)</p>
                    {financeDetail.connections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Link2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium text-foreground">Nenhuma conexão Open Finance</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">Os dados aparecem quando o cliente conecta instituições via Open Finance.</p>
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
                            <span className="text-sm font-medium truncate">{c.institution_name || "Instituição"}</span>
                            <span className="text-xs text-muted-foreground">({c.status})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow min-w-0">
                    <h2 className="text-sm font-semibold text-foreground">Contas Bancárias (Open Finance)</h2>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">{financeDetail.accounts.length} conta(s) sincronizada(s)</p>
                    {financeDetail.accounts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Wallet className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium text-foreground">Nenhuma conta encontrada</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">Contas serão listadas quando o cliente sincronizar pelo Open Finance.</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 md:hidden">
                          {financeDetail.accounts.map((a) => (
                            <div key={a.id} className="rounded-lg border border-border p-3 space-y-1.5 min-w-0">
                              <p className="text-sm font-medium break-words">{a.name}</p>
                              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Tipo:</span> {a.type || "-"}</p>
                              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Instituição:</span> {a.institution_name || "-"}</p>
                              <p className="text-sm font-medium text-right">{formatCurrency(a.current_balance)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="hidden md:block overflow-x-auto min-w-0">
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
              {loading ? "Carregando..." : (error || "Cliente não encontrado")}
            </div>
          ) : canViewWallet && financeDetail ? (
            <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Transações Recentes (Open Finance)</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Últimas {financeDetail.transactions.length} transações</p>
                </div>
              </div>
              {financeDetail.transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">Nenhuma transação encontrada</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">As transações aparecem quando o cliente tem contas conectadas pelo Open Finance.</p>
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
                            <p className="text-xs text-muted-foreground shrink-0">{format(new Date(tx.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                            <span className={`text-sm font-medium shrink-0 tabular-nums ${isIncome ? "text-success" : "text-destructive"}`}>
                              {isIncome ? "+" : ""}{formatCurrency(amount)}
                            </span>
                          </div>
                          <p className="text-sm font-medium break-words">{tx.description || tx.merchant || "-"}</p>
                          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Conta:</span> {tx.account_name || "-"}</p>
                          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Instituição:</span> {tx.institution_name || "-"}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[400px] min-w-0 pr-1 pb-1 transactions-scrollbar rounded-b-lg">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="sticky top-0 z-10 bg-card border-b border-border">
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conta</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instituição</th>
                          <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeDetail.transactions.map((tx) => {
                          const amount = Number(tx.amount || 0);
                          const isIncome = amount > 0;
                          return (
                            <tr key={tx.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                              <td className="py-2.5 px-3 text-muted-foreground">{format(new Date(tx.date), "dd/MM/yyyy", { locale: ptBR })}</td>
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
            <p className="text-sm text-muted-foreground py-4">O cliente desativou o compartilhamento da carteira. Os dados não estão disponíveis.</p>
          )}
        </TabsContent>

        <TabsContent value="credit_card" className="space-y-4 min-w-0 mt-0 md:mt-2">
          {!showContent ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              {loading ? "Carregando..." : (error || "Cliente não encontrado")}
            </div>
          ) : canViewWallet && financeDetail ? (
            <div className="rounded-xl border-2 border-amber-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-amber-500/5 transition-shadow min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Cartões de Crédito (Open Finance)</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{financeDetail.cards.length} cartão(ões)</p>
              {financeDetail.cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">Nenhum cartão encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">Cartões conectados pelo Open Finance aparecerão aqui.</p>
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
                            {card.brand || "Cartão"} ****{card.last4 || "****"}
                          </p>
                          <p className="text-xs text-muted-foreground break-words">{card.institution_name || "-"}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-destructive">{formatCurrency(card.openDebt)}</p>
                        <p className="text-xs text-muted-foreground">Fatura em aberto</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">O cliente desativou o compartilhamento da carteira. Os dados não estão disponíveis.</p>
          )}
        </TabsContent>

        <TabsContent value="investments" className="space-y-4 mt-0 md:mt-2">
          {!showContent ? (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              {loading ? "Carregando..." : (error || "Cliente não encontrado")}
            </div>
          ) : canViewWallet && financeDetail ? (
            <>
              <div className="rounded-xl border-2 border-violet-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-shadow min-w-0">
                <h2 className="text-sm font-semibold text-foreground">Investimentos (Open Finance)</h2>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{financeDetail.investments.length} posição(ões)</p>
                {financeDetail.investments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-foreground">Nenhum investimento encontrado</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">Os investimentos do cliente aparecerão aqui quando conectados pelo Open Finance.</p>
                  </div>
                ) : (
                  <div className="space-y-4 min-w-0">
                    {financeDetail.breakdown.length > 0 && (
                      <div className="space-y-2 min-w-0">
                        <h4 className="text-sm font-semibold">Alocação por tipo</h4>
                        {financeDetail.breakdown.map((b) => {
                          const pct = financeDetail.summary.investments > 0 ? (b.total / financeDetail.summary.investments) * 100 : 0;
                          return (
                            <div key={b.type} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
                              <span className="text-sm sm:w-20 shrink-0">{TYPE_LABELS[b.type] || b.type}</span>
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
                          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Tipo:</span> {TYPE_LABELS[inv.type] || inv.type || "-"}</p>
                          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Instituição:</span> {inv.institution_name || "-"}</p>
                          <div className="flex justify-between text-sm pt-1">
                            <span className="text-muted-foreground">Qtd: {Number(inv.quantity || 0).toLocaleString("pt-BR")}</span>
                            <span className="font-medium">{formatCurrency(inv.current_value)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto min-w-0">
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
                <h2 className="text-sm font-semibold text-foreground">Portfólio de Investimentos</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Detalhamento completo dos investimentos do cliente, incluindo ações, FIIs, fundos e renda fixa.
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-xl border-2 border-violet-500/70 bg-card p-5 shadow-sm min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Portfólio de Investimentos</h2>
              <p className="text-sm text-muted-foreground mt-1">
                O cliente desativou o compartilhamento da carteira. Os dados de investimentos não estão disponíveis.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 min-w-0 mt-0 md:mt-2">
          <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
            <h2 className="text-sm font-semibold text-foreground mb-4">Relatórios Gerados</h2>
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">Nenhum relatório gerado ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">Gere relatórios para este cliente pela ação &quot;Gerar Relatório&quot;.</p>
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
                        Gerado em {report.generatedAt}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {report.downloadUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={report.downloadUrl} download>
                            Baixar
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Processando...
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
              <h2 className="text-sm font-semibold text-foreground">Anotações</h2>
              <Button size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Nova Anotação
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
                      title="Excluir anotação"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-foreground break-words min-w-0">{note.content}</p>
                </div>
              ))}
              <div className="p-4 rounded-lg border-2 border-dashed border-border min-w-0">
                <Textarea
                  placeholder="Adicione uma nova anotação sobre este cliente..."
                  className="min-h-[100px] resize-none w-full min-w-0 max-w-full"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <Button className="mt-3" size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                  Salvar Anotação
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
                    title="Account"
                  >
                    <Wallet className="h-5 w-5 shrink-0" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="transaction"
                    className="flex items-center justify-center h-12 w-12 min-h-[44px] rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                    title="Transaction"
                  >
                    <Receipt className="h-5 w-5 shrink-0" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="credit_card"
                    className="flex items-center justify-center h-12 w-12 min-h-[44px] rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                    title="Credit card"
                  >
                    <CreditCard className="h-5 w-5 shrink-0" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="investments"
                    className="flex items-center justify-center h-12 w-12 min-h-[44px] rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                    title="Investments"
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
                title="Conta"
              >
                <Wallet className="h-4 w-4 shrink-0" />
                Conta
              </TabsTrigger>
              <TabsTrigger
                value="transaction"
                className="flex-none flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                title="Transações"
              >
                <Receipt className="h-4 w-4 shrink-0" />
                Transações
              </TabsTrigger>
              <TabsTrigger
                value="credit_card"
                className="flex-none flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                title="Cartão"
              >
                <CreditCard className="h-4 w-4 shrink-0" />
                Cartão
              </TabsTrigger>
              <TabsTrigger
                value="investments"
                className="flex-none flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-primary data-[state=active]:border data-[state=active]:border-sidebar-primary/30 shadow-none"
                title="Investimentos"
              >
                <TrendingUp className="h-4 w-4 shrink-0" />
                Investimentos
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </Tabs>

      {/* Delete Note Confirmation Dialog */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A anotação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingNoteId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDeleteNote();
              }}
              disabled={!!deletingNoteId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingNoteId ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientProfile;

