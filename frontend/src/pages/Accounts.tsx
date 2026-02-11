import { useState, useEffect, useCallback, useMemo } from "react";
import { Wallet, RefreshCw, Building2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const Accounts = () => {
  const { t } = useTranslation(['accounts', 'common']);
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());

  const accountsByBank = useMemo(() => {
    const map = new Map<string, { accounts: any[]; total: number }>();
    accounts.forEach((acc: any) => {
      const bank = acc.institution_name || t('common:others');
      if (!map.has(bank)) map.set(bank, { accounts: [], total: 0 });
      const entry = map.get(bank)!;
      entry.accounts.push(acc);
      entry.total += parseFloat(acc.current_balance || 0);
    });
    return Array.from(map.entries()).map(([name, { accounts: list, total }]) => ({ name, accounts: list, total }));
  }, [accounts]);

  const toggleBank = (bankName: string) => {
    setExpandedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(bankName)) next.delete(bankName);
      else next.add(bankName);
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const accountsData = await financeApi
        .getAccounts()
        .catch(() => ({ accounts: [], grouped: [], total: 0 }));

      setAccounts(accountsData.accounts || []);
      setTotalBalance(typeof accountsData.total === "number" ? accountsData.total : 0);
      setError(null);
    } catch (err: any) {
      setError(err?.error || t('accounts:errorLoading'));
      console.error("Error fetching accounts:", err);
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
        title: t('common:syncComplete'),
        description: t('accounts:syncSuccess'),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t('common:syncError'),
        description: err?.error || t('common:syncErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('accounts:title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('accounts:subtitle')}
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">{error}</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border-2 border-blue-500/70 bg-card p-4 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
            <ProfessionalKpiCard
              title={t('accounts:totalBalance')}
              value={`R$ ${totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              change=""
              changeType="neutral"
              icon={Wallet}
              iconClassName="text-blue-600 dark:text-blue-400"
              subtitle={t('common:accountCount', { count: accounts.length })}
            />
          </div>

          <ChartCard title={t('accounts:chartTitle')} subtitle={accounts.length > 0 ? t('common:accountCount', { count: accounts.length }) : undefined}>
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="rounded-full bg-muted/50 p-5 mb-4">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">{t('accounts:noAccounts')}</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {t('accounts:noAccountsDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 assets-scrollbar">
                {accountsByBank.map(({ name: bankName, accounts: bankAccounts, total: bankTotal }) => {
                  const isExpanded = expandedBanks.has(bankName);
                  return (
                    <div key={bankName} className="rounded-xl border border-border overflow-hidden bg-card/50">
                      <button
                        type="button"
                        onClick={() => toggleBank(bankName)}
                        className="flex items-center justify-between gap-3 w-full p-4 text-left hover:bg-muted/20 transition-colors min-w-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{bankName}</p>
                            <p className="text-xs text-muted-foreground">{t('common:accountCount', { count: bankAccounts.length })}</p>
                          </div>
                        </div>
                        <p className="font-semibold tabular-nums shrink-0">
                          R$ {bankTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/10">
                          {bankAccounts.map((acc: any) => (
                            <div
                              key={acc.id || acc.pluggy_account_id}
                              className="flex items-center justify-between gap-2 px-4 py-2.5 pl-14 hover:bg-muted/10 min-w-0"
                            >
                              <span className="text-sm truncate text-foreground">
                                {acc.name || acc.type || t('common:account')}
                              </span>
                              <span className="text-sm font-medium tabular-nums shrink-0">
                                R$ {parseFloat(acc.current_balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
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

export default Accounts;
