import { ArrowDownLeft, ArrowUpRight, Coffee, Home, ShoppingBag, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const transactions = [
  {
    id: 1,
    description: "Café Starbucks",
    category: "Alimentação",
    amount: -15.50,
    date: "Hoje",
    icon: Coffee,
  },
  {
    id: 2,
    description: "Depósito Salário",
    category: "Renda",
    amount: 5200.00,
    date: "Ontem",
    icon: ArrowDownLeft,
  },
  {
    id: 3,
    description: "Compra Amazon",
    category: "Compras",
    amount: -89.99,
    date: "12 Jan",
    icon: ShoppingBag,
  },
  {
    id: 4,
    description: "Conta de Luz",
    category: "Utilidades",
    amount: -145.00,
    date: "10 Jan",
    icon: Zap,
  },
  {
    id: 5,
    description: "Aluguel",
    category: "Moradia",
    amount: -1800.00,
    date: "5 Jan",
    icon: Home,
  },
];

const RecentTransactions = () => {
  return (
    <div className="chart-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Transações Recentes</h3>
        <button className="text-xs text-primary font-medium hover:underline transition-colors">
          Ver todas
        </button>
      </div>
      
      <div className="space-y-1">
        {transactions.map((transaction) => {
          const Icon = transaction.icon;
          const isPositive = transaction.amount > 0;
          
          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
                  isPositive ? "bg-success/10" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "h-4 w-4",
                    isPositive ? "text-success" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">{transaction.category}</p>
                </div>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <p className={cn(
                  "text-sm font-semibold tabular-nums",
                  isPositive ? "text-success" : "text-foreground"
                )}>
                  {isPositive ? "+" : ""}
                  {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-muted-foreground">{transaction.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentTransactions;
