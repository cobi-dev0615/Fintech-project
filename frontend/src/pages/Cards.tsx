import { useState, useEffect, useCallback } from "react";
import { CreditCard, RefreshCw, Building2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Cards = () => {
  const { toast } = useToast();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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

  const handleSync = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchData();
      toast({
        title: "Sincronização concluída",
        description: "Seus cartões foram atualizados.",
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

  const totalLimit = cards.reduce((s, c) => s + parseFloat(c.limit || 0), 0);
  const totalAvailable = cards.reduce((s, c) => s + parseFloat(c.available_limit || 0), 0);
  const totalBalance = cards.reduce((s, c) => s + parseFloat(c.balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cartões de Crédito</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cartões conectados via Open Finance
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

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
        </div>
      ) : (
        <>
          {cards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ProfessionalKpiCard
                title="Limite total"
                value={`R$ ${totalLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change=""
                changeType="neutral"
                icon={CreditCard}
                subtitle={`${cards.length} cartão(ões)`}
              />
              <ProfessionalKpiCard
                title="Disponível"
                value={`R$ ${totalAvailable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change=""
                changeType="positive"
                icon={CreditCard}
                subtitle="Limite disponível"
              />
              <ProfessionalKpiCard
                title="Faturas em aberto"
                value={`R$ ${totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                change=""
                changeType="neutral"
                icon={CreditCard}
                subtitle="Saldo devedor"
              />
            </div>
          )}

          <ChartCard title="Cartões (Open Finance)">
            {cards.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  Nenhum cartão conectado. Conecte suas contas em Conexões para ver os cartões aqui.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cards.map((card: any) => {
                  const limit = parseFloat(card.limit || 0);
                  const available = parseFloat(card.available_limit || 0);
                  const balance = parseFloat(card.balance || 0);
                  const usage = limit > 0 ? (balance / limit) * 100 : 0;
                  const inv = card.latest_invoice;
                  const dueDate = inv?.due_date
                    ? new Date(inv.due_date + "Z").toLocaleDateString("pt-BR")
                    : null;
                  return (
                    <div
                      key={card.id || card.pluggy_card_id}
                      className="p-4 rounded-xl border border-border bg-muted/20 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{card.institution_name || "Cartão"}</p>
                            <p className="text-xs text-muted-foreground">
                              {card.brand || ""} •••• {card.last4 || "****"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Limite</p>
                          <p className="font-medium tabular-nums">
                            R$ {limit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Disponível</p>
                          <p className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                            R$ {available.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fatura atual</p>
                          <p className="font-medium tabular-nums">
                            R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        {dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Vencimento</p>
                              <p className="font-medium">{dueDate}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      {limit > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Uso do limite</span>
                            <span>{usage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
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
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
};

export default Cards;
