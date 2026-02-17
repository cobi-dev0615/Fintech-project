import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { accountsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCategoryIcon } from "@/utils/category-icons";

// Format date to relative time
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    }
    
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  } catch {
    return dateString;
  }
};

const RecentTransactions = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await accountsApi.getTransactions(undefined, 5, 0);
        setTransactions(response.transactions || []);
      } catch (error) {
        console.error("Error fetching recent transactions:", error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);
  return (
    <div className="chart-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Transações Recentes</h3>
        <button 
          onClick={() => navigate('/app/accounts')}
          className="text-xs text-primary font-medium hover:underline transition-colors"
        >
          Ver todas
        </button>
      </div>
      
      <div className="space-y-1">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Carregando...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhuma transação recente</p>
          </div>
        ) : (
          transactions.map((transaction) => {
            const Icon = getCategoryIcon(transaction.category);
            const amount = parseFloat(transaction.amount_cents || 0) / 100;
            const isPositive = amount > 0;
            const description = transaction.description || transaction.merchant || "Transação";
            const category = transaction.category || "Outros";
            const date = formatDate(transaction.occurred_at);
            
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
                    <p className="text-sm font-medium text-foreground truncate">{description}</p>
                    <p className="text-xs text-muted-foreground">{category}</p>
                  </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className={cn(
                    "text-sm font-semibold tabular-nums",
                    isPositive ? "text-success" : "text-foreground"
                  )}>
                    {isPositive ? "+" : ""}
                    {formatCurrency(amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{date}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecentTransactions;
