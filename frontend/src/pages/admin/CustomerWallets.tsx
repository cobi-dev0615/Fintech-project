import React, { useState, useEffect, useCallback } from "react";
import { Search, Wallet, ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, RefreshCw, TrendingUp, CreditCard, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WalletEntry {
  customerId: string;
  name: string;
  email: string;
  createdAt: string;
  summary: { cash: number; investments: number; debt: number; netWorth: number };
  accounts: Array<{ id: string; displayName: string; accountType: string; balanceCents: number; balance: number; currency: string; lastRefreshedAt: string | null }>;
  holdings: Array<{ id: string; marketValueCents: number; marketValue: number; currency: string; quantity: number }>;
  cards: Array<{ id: string; displayName: string; balanceCents: number; openInvoiceCents: number; debt: number; currency: string }>;
}

const formatCurrency = (value: number, currency = "BRL") => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : currency,
  }).format(value);
};

const CustomerWallets = () => {
  const [wallets, setWallets] = useState<WalletEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCustomerWallets({
        page,
        limit: 20,
        search: searchQuery.trim() || undefined,
      });
      setWallets(res.wallets);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error("Failed to fetch customer wallets:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as carteiras dos clientes.",
        variant: "destructive",
      });
      setWallets([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, toast]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWallets();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7" />
            Carteiras dos Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize todas as carteiras de clientes a qualquer momento (acesso administrativo, sem aprovação do cliente).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchWallets()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <ChartCard title="Filtros" className="p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </ChartCard>

      <ChartCard className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : wallets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Wallet className="h-12 w-12 mb-2 opacity-50" />
            Nenhuma carteira encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-8 p-2" />
                  <th className="text-left p-3 font-medium">Cliente</th>
                  <th className="text-left p-3 font-medium">E-mail</th>
                  <th className="text-right p-3 font-medium">Caixa</th>
                  <th className="text-right p-3 font-medium">Investimentos</th>
                  <th className="text-right p-3 font-medium">Dívida</th>
                  <th className="text-right p-3 font-medium">Patrimônio</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <React.Fragment key={w.customerId}>
                    <tr
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === w.customerId ? null : w.customerId)}
                    >
                      <td className="p-2">
                        {expandedId === w.customerId ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="p-3 font-medium">{w.name}</td>
                      <td className="p-3 text-muted-foreground">{w.email}</td>
                      <td className="p-3 text-right">{formatCurrency(w.summary.cash)}</td>
                      <td className="p-3 text-right">{formatCurrency(w.summary.investments)}</td>
                      <td className="p-3 text-right text-destructive">{formatCurrency(w.summary.debt)}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(w.summary.netWorth)}</td>
                    </tr>
                    {expandedId === w.customerId && (
                      <tr className="bg-muted/20">
                        <td colSpan={7} className="p-4">
                          <div className="grid gap-4 sm:grid-cols-3 text-sm">
                            {w.accounts.length > 0 && (
                              <div>
                                <h4 className="font-medium flex items-center gap-2 mb-2">
                                  <Building2 className="h-4 w-4" /> Contas
                                </h4>
                                <ul className="space-y-1">
                                  {w.accounts.map((a) => (
                                    <li key={a.id} className="flex justify-between">
                                      <span className="text-muted-foreground">{a.displayName || a.accountType}</span>
                                      <span>{formatCurrency(a.balance)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {w.holdings.length > 0 && (
                              <div>
                                <h4 className="font-medium flex items-center gap-2 mb-2">
                                  <TrendingUp className="h-4 w-4" /> Investimentos
                                </h4>
                                <ul className="space-y-1">
                                  {w.holdings.map((h) => (
                                    <li key={h.id} className="flex justify-between">
                                      <span className="text-muted-foreground">Posição</span>
                                      <span>{formatCurrency(h.marketValue)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {w.cards.length > 0 && (
                              <div>
                                <h4 className="font-medium flex items-center gap-2 mb-2">
                                  <CreditCard className="h-4 w-4" /> Cartões
                                </h4>
                                <ul className="space-y-1">
                                  {w.cards.map((c) => (
                                    <li key={c.id} className="flex justify-between">
                                      <span className="text-muted-foreground">{c.displayName}</span>
                                      <span className="text-destructive">{formatCurrency(c.debt)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {w.accounts.length === 0 && w.holdings.length === 0 && w.cards.length === 0 && (
                              <p className="text-muted-foreground col-span-3">Nenhum dado de conta, investimento ou cartão vinculado.</p>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs mt-2">
                            Cadastro em {format(new Date(w.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Página {pagination.page} de {Math.max(1, pagination.totalPages)} ({pagination.total} clientes)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={pagination.page <= 1}
                onClick={() => setPage(1)}
                title="Primeira página"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
                {pagination.page} / {Math.max(1, pagination.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || pagination.totalPages === 0}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={pagination.page >= pagination.totalPages || pagination.totalPages === 0}
                onClick={() => setPage(Math.max(1, pagination.totalPages))}
                title="Última página"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default CustomerWallets;
