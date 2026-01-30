import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Transações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Transações sincronizadas via Open Finance
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

      <ChartCard title="Transações">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou estabelecimento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={limit.toString()}
              onValueChange={(v) => setLimit(Number(v))}
            >
              <SelectTrigger className="w-[140px]">
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
            <p className="text-sm text-muted-foreground">
              Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total} transações
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Nenhuma transação encontrada. Conecte contas em Conexões → Open Finance e sincronize.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                      Data
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                      Descrição
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                      Categoria
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">
                      Valor
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: any) => (
                    <TableRow key={tx.id ?? tx.pluggy_transaction_id ?? tx.date + tx.description}>
                      <TableCell className="text-sm">
                        {tx.date ? new Date(tx.date).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {tx.description || tx.merchant || "Transação"}
                          </p>
                          {tx.account_name && (
                            <p className="text-xs text-muted-foreground">{tx.account_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-1 rounded bg-muted">
                          {tx.category || "Outros"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            parseFloat(tx.amount ?? 0) >= 0
                              ? "font-semibold text-green-600 dark:text-green-400"
                              : "font-semibold text-red-600 dark:text-red-400"
                          }
                        >
                          R${" "}
                          {Math.abs(parseFloat(tx.amount ?? 0)).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
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
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima
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
