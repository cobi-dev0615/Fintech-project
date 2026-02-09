import { useState, useEffect, useCallback } from "react";
import { CreditCard, RefreshCw, Building2, Calendar, TrendingUp, Wallet, Banknote, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Cards = () => {
  const { toast } = useToast();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingCardItemId, setSyncingCardItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financeApi.getCards().catch(() => ({ cards: [] }));
      setCards(data.cards || []);
      setError(null);
    } catch (err: any) {
      setError(err?.error || "Erro ao carregar cartões");
      console.error("Error fetching cards:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchData();
      toast({
        title: "Sincronização concluída",
        description: "Seus cartões foram atualizados.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Erro na sincronização",
        description: err?.error || "Não foi possível sincronizar.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncCard = async (card: any) => {
    const itemId = card.item_id;
    if (!itemId) return;
    try {
      setSyncingCardItemId(itemId);
      await financeApi.sync(itemId);
      await fetchData();
      toast({
        title: "Cartão atualizado",
        description: `${card.institution_name || "Cartão"} sincronizado.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao sincronizar cartão",
        description: err?.error || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSyncingCardItemId(null);
    }
  };

  const totalLimit = cards.reduce((s, c) => s + parseFloat(c.limit || 0), 0);
  const totalAvailable = cards.reduce((s, c) => s + parseFloat(c.available_limit || 0), 0);
  const totalBalance = cards.reduce((s, c) => s + parseFloat(c.balance || 0), 0);

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">Cartões de Crédito</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cartões conectados via Open Finance
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAll}
                disabled={syncing || loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando…" : "Sincronizar todos"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Atualizar dados de todos os cartões conectados</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Carregando cartões...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <>
          {cards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ProfessionalKpiCard
                title="Limite total"
                value={`R$ ${totalLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change=""
                changeType="neutral"
                icon={Wallet}
                subtitle={`${cards.length} cartão(ões)`}
              />
              <ProfessionalKpiCard
                title="Disponível"
                value={`R$ ${totalAvailable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change=""
                changeType="positive"
                icon={Banknote}
                subtitle="Limite disponível"
              />
              <ProfessionalKpiCard
                title="Faturas em aberto"
                value={`R$ ${totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change=""
                changeType="neutral"
                icon={FileText}
                subtitle="Saldo devedor"
              />
            </div>
          )}

          <ChartCard
            title="Cartões (Open Finance)"
            subtitle={cards.length > 0 ? `${cards.length} cartão(ões)` : undefined}
          >
            {cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="rounded-full bg-muted/50 p-5 mb-4">
                  <CreditCard className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">Nenhum cartão conectado</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Conecte suas contas em Conexões → Open Finance para sincronizar seus cartões de crédito aqui.
                </p>
              </div>
            ) : (
              <TooltipProvider>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                  {cards.map((card: any) => {
                    const limit = parseFloat(card.limit || 0);
                    const available = parseFloat(card.available_limit || 0);
                    const balance = parseFloat(card.balance || 0);
                    const usage = limit > 0 ? (balance / limit) * 100 : 0;
                    const inv = card.latest_invoice;
                    const dueDate = inv?.due_date
                      ? new Date(inv.due_date + "Z").toLocaleDateString("pt-BR")
                      : null;
                    const isBroker = card.institution_type === "broker";
                    const isSyncingThis = syncingCardItemId === card.item_id;
                    return (
                      <div
                        key={card.id || card.pluggy_card_id}
                        className="p-3 sm:p-4 rounded-xl border border-border bg-card/50 hover:bg-card/70 transition-colors space-y-2.5 min-w-0"
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                              {isBroker ? (
                                <TrendingUp className="h-5 w-5" />
                              ) : (
                                <Building2 className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium truncate">{card.institution_name || "Cartão"}</p>
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-[10px] px-1.5 py-0 font-normal"
                                >
                                  {isBroker ? "Corretora" : "Banco"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {card.brand || ""} •••• {card.last4 || "****"}
                              </p>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => handleSyncCard(card)}
                                disabled={isSyncingThis || syncing || !card.item_id}
                                aria-label={isSyncingThis ? "Sincronizando…" : "Sincronizar este cartão"}
                              >
                                <RefreshCw
                                  className={`h-4 w-4 ${isSyncingThis ? "animate-spin" : ""}`}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isSyncingThis ? "Sincronizando…" : "Sincronizar este cartão"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {/* Limite, Disponível e Fatura agrupados */}
                        <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm min-w-0">
                          <div>
                            <p className="text-xs text-muted-foreground">Limite</p>
                            <p className="font-medium tabular-nums text-foreground">
                              R$ {limit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Disponível</p>
                            <p className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                              R$ {available.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Fatura atual</p>
                            <p className="font-medium tabular-nums text-foreground">
                              R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        {dueDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Vencimento</p>
                              <p className="font-medium">{dueDate}</p>
                            </div>
                          </div>
                        )}
                        {limit > 0 && (
                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Uso do limite</span>
                              <span className={`font-medium tabular-nums ${
                                usage > 80 ? "text-destructive" : usage > 60 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                              }`}>
                                {usage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-[width] ${
                                  usage > 80 ? "bg-destructive" : usage > 60 ? "bg-amber-500" : "bg-primary"
                                }`}
                                style={{ width: `${Math.min(usage, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
};

export default Cards;
