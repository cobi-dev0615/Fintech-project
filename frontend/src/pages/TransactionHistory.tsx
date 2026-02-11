import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Search, ChevronLeft, ChevronRight, Receipt, ArrowDownLeft, ArrowUpRight } from "lucide-react";
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
import { useTranslation } from "react-i18next";

const LIMIT_OPTIONS = [10, 20, 50, 100];

const formatDateKey = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
};

const formatDateLabel = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const TransactionHistory = () => {
  const { t } = useTranslation(['transactions', 'common']);
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [accountOptions, setAccountOptions] = useState<{ value: string; label: string }[]>([]);

  const setDatePreset = (days: number | null) => {
    if (days === null) {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateTo(to.toISOString().slice(0, 10));
    setDateFrom(from.toISOString().slice(0, 10));
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await financeApi.getAccounts().catch(() => ({ accounts: [] }));
      const list = (data.accounts || []) as any[];
      const options = list.map((acc: any) => ({
        value: String(acc.pluggy_account_id ?? acc.id ?? ""),
        label: [acc.institution_name, acc.name].filter(Boolean).join(" • ") || "Conta",
      })).filter((o: { value: string }) => o.value);
      setAccountOptions(options);
    } catch {
      setAccountOptions([]);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await financeApi.getTransactions({
        page,
        limit,
        q: search || undefined,
        accountId: accountId || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
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
      setError(err?.message ?? err?.error ?? t('transactions:errorLoading'));
      setTransactions([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, accountId, dateFrom, dateTo]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setPage(1);
  }, [search, limit, accountId, dateFrom, dateTo]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchTransactions();
      toast({
        title: t('common:sync'),
        description: t('transactions:syncSuccess'),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t('common:error'),
        description: err?.error ?? t('common:syncError'),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const groupedByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    transactions.forEach((tx: any) => {
      const key = formatDateKey(tx.date || "");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (b > a ? 1 : -1))
      .map(([dateKey, list]) => ({ dateKey, list }));
  }, [transactions]);

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">{t('transactions:title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('transactions:subtitle')}
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
          {syncing ? t('common:syncing') : t('common:sync')}
        </Button>
      </div>

      <ChartCard
        title={t('transactions:chartTitle')}
        subtitle={total > 0 ? t('transactions:transactionCount', { count: total }) : undefined}
        className="min-w-0"
      >
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Filters: compact on desktop, stacked on mobile */}
        <div className="flex flex-col gap-2 mb-3 min-w-0">
          {/* Row 1: search + account + per page (inline on sm+) */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 min-w-0">
            <div className="relative flex-1 min-w-0 sm:max-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder={t('transactions:searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-full min-w-0 text-sm"
              />
            </div>
            <Select value={accountId || "all"} onValueChange={(v) => setAccountId(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 w-full sm:w-[160px] min-w-0 shrink-0 text-sm">
                <SelectValue placeholder={t('transactions:account')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('transactions:allAccounts')}</SelectItem>
                {accountOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label.length > 28 ? opt.label.slice(0, 25) + "…" : opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="h-9 w-full sm:w-[100px] min-w-0 shrink-0 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} {t('transactions:perPage')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: period presets + date range (one row on md+, wraps on small) */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-muted-foreground shrink-0 py-1.5">{t('transactions:period')}</span>
            {[
              { label: t('transactions:days7'), days: 7 },
              { label: t('transactions:days30'), days: 30 },
              { label: t('transactions:days90'), days: 90 },
              { label: t('transactions:all'), days: null },
            ].map(({ label, days }) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                className="h-8 shrink-0 text-xs px-2.5"
                onClick={() => setDatePreset(days)}
              >
                {label}
              </Button>
            ))}
            <span className="hidden sm:inline text-muted-foreground text-xs shrink-0">|</span>
            <label htmlFor="tx-date-from" className="text-xs text-muted-foreground shrink-0">{t('transactions:dateFrom')}</label>
            <Input
              id="tx-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 min-w-[8.5rem] w-[8.5rem] shrink-0 text-xs [&::-webkit-calendar-picker-indicator]:opacity-100"
              title={t('transactions:dateFrom')}
            />
            <span className="text-muted-foreground text-xs shrink-0">{t('transactions:dateTo')}</span>
            <Input
              id="tx-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 min-w-[8.5rem] w-[8.5rem] shrink-0 text-xs [&::-webkit-calendar-picker-indicator]:opacity-100"
              title={t('transactions:dateTo')}
            />
          </div>

          {total > 0 && (
            <p className="text-xs text-muted-foreground truncate pt-0.5">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">{t('transactions:loadingTransactions')}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted/50 p-5 mb-4">
              <Receipt className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">{t('transactions:noTransactions')}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {t('transactions:noTransactionsDesc')}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 assets-scrollbar">
              {groupedByDate.map(({ dateKey, list }) => (
                <div key={dateKey} className="space-y-2 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide sticky top-0 bg-background/95 py-1 z-10">
                    {formatDateLabel(dateKey)}
                  </p>
                  <ul className="space-y-2 list-none p-0 m-0">
                    {list.map((tx: any) => {
                      const amount = parseFloat(tx.amount ?? 0);
                      const isCredit = amount >= 0;
                      const amountColor = isCredit
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400";
                      const Icon = isCredit ? ArrowUpRight : ArrowDownLeft;
                      return (
                        <li
                          key={tx.id ?? tx.pluggy_transaction_id ?? tx.date + (tx.description || "") + (tx.amount ?? "")}
                          className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5 w-full min-w-0 box-border"
                        >
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground shrink-0">
                              {tx.date ? new Date(tx.date).toLocaleDateString("pt-BR") : "—"}
                            </span>
                            <span className={`flex items-center gap-1 text-sm font-semibold tabular-nums shrink-0 ${amountColor}`}>
                              <Icon className="h-3.5 w-3.5" />
                              {amount >= 0 ? "+" : "−"} R${" "}
                              {Math.abs(amount).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground break-words min-w-0">
                            {tx.description || tx.merchant || t('transactions:transaction')}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            {tx.account_name && (
                              <span className="text-xs text-muted-foreground truncate max-w-full">
                                {tx.account_name}
                              </span>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                              {tx.category || t('transactions:others')}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  {t('transactions:page')} {page} {t('transactions:of')} {totalPages}
                </p>
                <div className="flex items-center justify-center gap-1 min-w-0 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label={t('transactions:previous')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden xs:inline">{t('transactions:previous')}</span>
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
                    aria-label={t('transactions:next')}
                  >
                    <span className="hidden sm:inline">{t('transactions:next')}</span>
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
