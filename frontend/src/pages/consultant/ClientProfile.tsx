import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, MessageSquare, Plus, TrendingUp, Wallet, EyeOff, Trash2, DollarSign, CreditCard, Building2, Loader2 } from "lucide-react";
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
import ChartCard from "@/components/dashboard/ChartCard";
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
  const [activeTab, setActiveTab] = useState("overview");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error || !clientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error || "Cliente não encontrado"}</p>
      </div>
    );
  }

  const { client, financial, notes, reports, walletShared } = clientData;
  const canViewWallet = walletShared !== false && financial != null;

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/consultant/clients" className="shrink-0">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">{client.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 truncate sm:break-all" title={client.email}>
              {client.email}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" disabled={!canViewWallet}>
            <FileText className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">Gerar Relatório</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">Mensagem</span>
          </Button>
        </div>
      </div>

      {/* Wallet sharing disabled notice */}
      {!canViewWallet && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 min-w-0">
          <EyeOff className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium break-words min-w-0">
            O cliente desativou o compartilhamento da carteira. Você pode enviar mensagens e adicionar anotações, mas os dados financeiros não estão disponíveis.
          </p>
        </div>
      )}

      {/* KPI Cards - only when wallet is shared */}
      {canViewWallet && financial && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <ProfessionalKpiCard
          title="Patrimônio Líquido"
          value={`R$ ${financial.netWorth.toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Caixa"
          value={`R$ ${financial.cash.toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={DollarSign}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Investimentos"
          value={`R$ ${financial.investments.toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Dívidas"
          value={`R$ ${financial.debt.toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={CreditCard}
          subtitle=""
        />
      </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 min-w-0">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 w-full sm:w-auto sm:inline-flex">
          <TabsTrigger value="overview" className="flex-1 min-w-0 sm:flex-none text-xs sm:text-sm px-2.5 py-1.5 sm:px-3">Visão Geral</TabsTrigger>
          <TabsTrigger value="investments" className="flex-1 min-w-0 sm:flex-none text-xs sm:text-sm px-2.5 py-1.5 sm:px-3">Investimentos</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 min-w-0 sm:flex-none text-xs sm:text-sm px-2.5 py-1.5 sm:px-3">Relatórios</TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 min-w-0 sm:flex-none text-xs sm:text-sm px-2.5 py-1.5 sm:px-3">Anotações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 min-w-0 mt-2">
          <ChartCard title="Resumo Financeiro">
            {canViewWallet ? (
              <p className="text-sm text-muted-foreground">
                Visão consolidada das finanças do cliente. Os dados são atualizados automaticamente
                através das conexões com instituições financeiras.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                O cliente desativou o compartilhamento da carteira. Os dados financeiros não estão disponíveis.
              </p>
            )}
          </ChartCard>

          {canViewWallet && (
            <>
              {financeLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {!financeLoading && financeDetail && (
                <>
                  <ChartCard title="Conexões Open Finance" subtitle={`${financeDetail.connections.length} instituição(ões) conectada(s)`}>
                    {financeDetail.connections.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Nenhuma conexão Open Finance. Os dados abaixo são obtidos quando o cliente conecta instituições via Open Finance.</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {financeDetail.connections.map((c) => (
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

                  <ChartCard title="Contas Bancárias (Open Finance)" subtitle={`${financeDetail.accounts.length} conta(s) sincronizada(s)`}>
                    {financeDetail.accounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Nenhuma conta do Open Finance encontrada.</p>
                    ) : (
                      <div className="overflow-x-auto min-w-0">
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
                    )}
                  </ChartCard>

                  <ChartCard title="Investimentos (Open Finance)" subtitle={`${financeDetail.investments.length} posição(ões)`}>
                    {financeDetail.investments.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Nenhum investimento do Open Finance encontrado.</p>
                    ) : (
                      <div className="space-y-4 min-w-0">
                        {financeDetail.breakdown.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Alocação por tipo</h4>
                            {financeDetail.breakdown.map((b) => {
                              const pct = financeDetail.summary.investments > 0 ? (b.total / financeDetail.summary.investments) * 100 : 0;
                              return (
                                <div key={b.type} className="flex items-center gap-3 min-w-0">
                                  <span className="text-sm w-20 shrink-0">{TYPE_LABELS[b.type] || b.type}</span>
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-0">
                                    <div
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-28 text-right shrink-0">{formatCurrency(b.total)}</span>
                                  <span className="text-xs text-muted-foreground w-12 shrink-0">{pct.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="overflow-x-auto min-w-0">
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
                  </ChartCard>

                  <ChartCard title="Cartões de Crédito (Open Finance)" subtitle={`${financeDetail.cards.length} cartão(ões)`}>
                    {financeDetail.cards.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Nenhum cartão do Open Finance encontrado.</p>
                    ) : (
                      <div className="space-y-3">
                        {financeDetail.cards.map((card) => (
                          <div
                            key={card.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-border min-w-0"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {card.brand || "Cartão"} ****{card.last4 || "****"}
                                </p>
                                <p className="text-xs text-muted-foreground">{card.institution_name || "-"}</p>
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
                  </ChartCard>

                  <ChartCard title="Transações Recentes (Open Finance)" subtitle={`Últimas ${financeDetail.transactions.length} transações`}>
                    {financeDetail.transactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Nenhuma transação do Open Finance encontrada.</p>
                    ) : (
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto min-w-0">
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
                            {financeDetail.transactions.map((tx) => {
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
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="investments" className="space-y-4">
          <ChartCard title="Portfólio de Investimentos">
            {canViewWallet ? (
              <p className="text-sm text-muted-foreground">
                Detalhamento completo dos investimentos do cliente, incluindo ações, FIIs,
                fundos e renda fixa.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                O cliente desativou o compartilhamento da carteira. Os dados de investimentos não estão disponíveis.
              </p>
            )}
          </ChartCard>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 min-w-0 mt-2">
          <ChartCard title="Relatórios Gerados">
            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum relatório gerado ainda
                </p>
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
          </ChartCard>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4 min-w-0 mt-2">
          <ChartCard 
            title="Anotações" 
            actions={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Anotação
              </Button>
            }
          >
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
          </ChartCard>
        </TabsContent>
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

