import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Coffee, Home, ShoppingBag, Zap, DollarSign, CreditCard, Receipt, Building2, Car, Heart, Gamepad2, GraduationCap, Briefcase, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { accountsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCurrency } from "@/contexts/CurrencyContext";

// Map category to icon
const getCategoryIcon = (category: string | null | undefined) => {
  if (!category) return DollarSign;
  
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('alimentação') || categoryLower.includes('food') || categoryLower.includes('restaurant') || categoryLower.includes('café')) {
    return Coffee;
  }
  if (categoryLower.includes('compras') || categoryLower.includes('shopping') || categoryLower.includes('retail')) {
    return ShoppingBag;
  }
  if (categoryLower.includes('utilidades') || categoryLower.includes('utilities') || categoryLower.includes('luz') || categoryLower.includes('água') || categoryLower.includes('energia')) {
    return Zap;
  }
  if (categoryLower.includes('moradia') || categoryLower.includes('housing') || categoryLower.includes('aluguel') || categoryLower.includes('rent')) {
    return Home;
  }
  if (categoryLower.includes('transporte') || categoryLower.includes('transport') || categoryLower.includes('carro') || categoryLower.includes('gasolina')) {
    return Car;
  }
  if (categoryLower.includes('saúde') || categoryLower.includes('health') || categoryLower.includes('médico') || categoryLower.includes('farmacia')) {
    return Heart;
  }
  if (categoryLower.includes('educação') || categoryLower.includes('education') || categoryLower.includes('escola') || categoryLower.includes('curso')) {
    return GraduationCap;
  }
  if (categoryLower.includes('trabalho') || categoryLower.includes('work') || categoryLower.includes('escritório')) {
    return Briefcase;
  }
  if (categoryLower.includes('entretenimento') || categoryLower.includes('entertainment') || categoryLower.includes('jogo') || categoryLower.includes('game')) {
    return Gamepad2;
  }
  if (categoryLower.includes('renda') || categoryLower.includes('income') || categoryLower.includes('salário') || categoryLower.includes('depósito')) {
    return ArrowDownLeft;
  }
  if (categoryLower.includes('cartão') || categoryLower.includes('card') || categoryLower.includes('credit')) {
    return CreditCard;
  }
  if (categoryLower.includes('conta') || categoryLower.includes('bill') || categoryLower.includes('pagamento')) {
    return Receipt;
  }
  if (categoryLower.includes('banco') || categoryLower.includes('bank') || categoryLower.includes('instituição')) {
    return Building2;
  }
  
  return DollarSign;
};

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
