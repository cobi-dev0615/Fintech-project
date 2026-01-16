import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";

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

  const transactions: Transaction[] = [
    {
      id: "1",
      description: "Café Starbucks",
      amount: -15.50,
      date: "Hoje",
      category: "Alimentação",
      account: "Nubank",
    },
    {
      id: "2",
      description: "Depósito de Salário",
      amount: 5000.00,
      date: "Ontem",
      category: "Renda",
      account: "Itaú",
    },
    {
      id: "3",
      description: "Compra na Amazon",
      amount: -245.90,
      date: "12 de Jan",
      category: "Compras",
      account: "Nubank",
    },
    {
      id: "4",
      description: "Conta de Luz",
      amount: -180.00,
      date: "10 de Jan",
      category: "Utilidades",
      account: "Itaú",
    },
    {
      id: "5",
      description: "Pagamento de Aluguel",
      amount: -2500.00,
      date: "5 de Jan",
      category: "Moradia",
      account: "Itaú",
    },
  ];

  const filteredTransactions = transactions.filter((t) =>
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Account Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ProfessionalKpiCard
          title="Saldo Total"
          value="R$ 23.450"
          change=""
          changeType="neutral"
          icon={Wallet}
          subtitle="3 contas"
        />
        <ProfessionalKpiCard
          title="Receitas do Mês"
          value="R$ 5.000"
          change="+15%"
          changeType="positive"
          icon={TrendingUp}
          subtitle="vs mês anterior"
        />
        <ProfessionalKpiCard
          title="Despesas do Mês"
          value="R$ 2.941"
          change="-8%"
          changeType="positive"
          icon={TrendingDown}
          subtitle="vs mês anterior"
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
    </div>
  );
};

export default Accounts;
