import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const LIMIT_OPTIONS = [10, 20, 50, 100];

const TransactionHistory = () => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financeApi.getTransactions({
        page,
        limit,
        q: search || undefined,
      });
      setTransactions(data.transactions || []);
      const res = data as {
        transactions?: any[];
        total?: number;
        pagination?: { total?: number; totalPages?: number };
      };
      const rawTotal = res.pagination?.total ?? res.total ?? 0;
      setTotal(Number(rawTotal));
      const pages = res.pagination?.totalPages ?? Math.max(1, Math.ceil(Number(rawTotal) / limit));
      setTotalPages(pages);
    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      setTransactions([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setPage(1);
  }, [search, limit]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchTransactions();
      toast({
        title: "Sincronização concluída",
        description: "Transações atualizadas via Open Finance.",
      });
    } catch (err: any) {
      toast({
        title: "Erro na sincronização",
        description: err?.error ?? "Não foi possível sincronizar.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">Histórico de Transações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Transações sincronizadas via Open Finance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing || loading}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando…" : "Atualizar"}
        </Button>
      </div>

      <ChartCard title="Transações" className="min-w-0">
        {/* Filters: mobile-first, full width */}
        <div className="flex flex-col gap-3 mb-4 min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 min-w-0">
            <div className="relative w-full min-w-0 sm:flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full min-w-0 max-w-full"
              />
            </div>
            <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="w-full min-w-0 sm:w-[120px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} por página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {total > 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 px-2">
            <p className="text-sm text-muted-foreground break-words">
              Nenhuma transação encontrada. Conecte contas em Conexões → Open Finance e sincronize.
            </p>
          </div>
        ) : (
          <>
            {/* Single mobile-first list for all screen sizes: stacked cards, no horizontal scroll */}
            <ul className="space-y-2 w-full min-w-0 list-none p-0 m-0">
              {transactions.map((tx: any) => {
                const amount = parseFloat(tx.amount ?? 0);
                const amountColor = amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
                return (
                  <li
                    key={tx.id ?? tx.pluggy_transaction_id ?? tx.date + tx.description}
                    className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5 w-full min-w-0 box-border"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground shrink-0">
                        {tx.date ? new Date(tx.date).toLocaleDateString("pt-BR") : "—"}
                      </span>
                      <span className={`text-sm font-semibold tabular-nums shrink-0 ${amountColor}`}>
                        {amount >= 0 ? "+" : "−"} R$ {Math.abs(amount).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground break-words min-w-0">
                      {tx.description || tx.merchant || "Transação"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      {tx.account_name && (
                        <span className="text-xs text-muted-foreground truncate max-w-full">
                          {tx.account_name}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        {tx.category || "Outros"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination: compact, no horizontal overflow */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  Página {page} de {totalPages}
                </p>
                <div className="flex items-center justify-center gap-1 min-w-0 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden xs:inline">Anterior</span>
                  </Button>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (page <= 3) p = i + 1;
                      else if (page >= totalPages - 2) p = totalPages - 4 + i;
                      else p = page - 2 + i;
                      return (
                        <Button
                          key={p}
                          variant={page === p ? "default" : "outline"}
                          size="sm"
                          className="min-w-8 h-8 shrink-0 p-0"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Próxima página"
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </ChartCard>
    </div>
  );
};

export default TransactionHistory;
