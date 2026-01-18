import { useState, useEffect } from "react";
import { Wallet, TrendingUp, TrendingDown, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { accountsApi } from "@/lib/api";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  account: string;
}

const Accounts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [accountsData, transactionsData] = await Promise.all([
          accountsApi.getAll(),
          accountsApi.getTransactions(),
        ]);
        setAccounts(accountsData.accounts);
        setTransactions(transactionsData.transactions);
        setError(null);
      } catch (err: any) {
        setError(err?.error || "Erro ao carregar dados");
        console.error("Error fetching accounts data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredTransactions = transactions
    .map((t: any) => ({
      id: t.id,
      description: t.description || t.merchant || "Sem descrição",
      amount: parseFloat(t.amount_cents) / 100,
      date: t.occurred_at ? new Date(t.occurred_at).toLocaleDateString("pt-BR") : "N/A",
      category: t.category || "Outros",
      account: t.account_name || "Conta",
    }))
    .filter((t) =>
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance_cents) / 100), 0);
  
  // Calculate income and expenses from transactions (last 30 days)
  const monthlyIncome = transactions
    .filter((t: any) => {
      const date = t.occurred_at ? new Date(t.occurred_at) : null;
      if (!date) return false;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return date >= thirtyDaysAgo && parseFloat(t.amount_cents) > 0;
    })
    .reduce((sum, t: any) => sum + (parseFloat(t.amount_cents) / 100), 0);

  const monthlyExpenses = transactions
    .filter((t: any) => {
      const date = t.occurred_at ? new Date(t.occurred_at) : null;
      if (!date) return false;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return date >= thirtyDaysAgo && parseFloat(t.amount_cents) < 0;
    })
    .reduce((sum, t: any) => sum + Math.abs(parseFloat(t.amount_cents) / 100), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize contas bancárias e histórico de transações
          </p>
        </div>
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
          {/* Account Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfessionalKpiCard
              title="Saldo Total"
              value={`R$ ${totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              change=""
              changeType="neutral"
              icon={Wallet}
              subtitle={`${accounts.length} conta(s)`}
            />
            <ProfessionalKpiCard
              title="Receitas do Mês"
              value={`R$ ${monthlyIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              change=""
              changeType="positive"
              icon={TrendingUp}
              subtitle="últimos 30 dias"
            />
            <ProfessionalKpiCard
              title="Despesas do Mês"
              value={`R$ ${monthlyExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              change=""
              changeType="neutral"
              icon={TrendingDown}
              subtitle="últimos 30 dias"
            />
          </div>

      {/* Filters and Search */}
      <ChartCard title="Transações">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Transactions Table */}
        <div className="space-y-1">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Nenhuma transação encontrada
              </p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {transaction.description}
                    </p>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                      {transaction.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{transaction.date}</span>
                    <span>•</span>
                    <span>{transaction.account}</span>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      transaction.amount >= 0
                        ? "text-success"
                        : "text-foreground"
                    }`}
                  >
                    {transaction.amount >= 0 ? "+" : ""}
                    R$ {Math.abs(transaction.amount).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ChartCard>
        </>
      )}
    </div>
  );
};

export default Accounts;
