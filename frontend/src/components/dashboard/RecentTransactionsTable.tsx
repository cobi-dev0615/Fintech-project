import { Link } from "react-router-dom";
import ChartCard from "./ChartCard";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCategoryIcon } from "@/utils/category-icons";
import { cn } from "@/lib/utils";
import i18n from "i18next";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  category: string | null;
  merchant: string;
  status: string;
}

interface RecentTransactionsTableProps {
  transactions: Transaction[];
  loading?: boolean;
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const localeMap: Record<string, string> = { 'pt-BR': 'pt-BR', pt: 'pt-BR', en: 'en-US' };
    const locale = localeMap[i18n.language] || i18n.language;
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

const ROW_HEIGHT = 52; // px per row (py-3 + content)
const VISIBLE_ROWS = 10;

const RecentTransactionsTable = ({ transactions, loading }: RecentTransactionsTableProps) => {
  const { t } = useTranslation(['dashboard']);
  const { formatCurrency } = useCurrency();

  return (
    <ChartCard
      title={t('dashboard:analytics.recentTransactions')}
      actions={
        <Link to="/app/transactions" className="text-xs text-primary font-medium hover:underline">
          {t('dashboard:analytics.viewAll')}
        </Link>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          {t('dashboard:analytics.noData')}
        </div>
      ) : (
        <div className="-mx-5 sm:-mx-6 px-5 sm:px-6">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[35%] sm:w-[28%]" />
              <col className="hidden sm:table-column w-[18%]" />
              <col className="w-[20%] sm:w-[14%]" />
              <col className="w-[25%] sm:w-[20%]" />
              <col className="hidden sm:table-column w-[20%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-muted-foreground pb-3 pl-1">{t('dashboard:analytics.merchant')}</th>
                <th className="text-center text-xs font-medium text-muted-foreground pb-3 hidden sm:table-cell">{t('dashboard:analytics.category')}</th>
                <th className="text-center text-xs font-medium text-muted-foreground pb-3">{t('dashboard:analytics.date')}</th>
                <th className="text-right text-xs font-medium text-muted-foreground pb-3">{t('dashboard:analytics.amount')}</th>
                <th className="text-center text-xs font-medium text-muted-foreground pb-3 hidden sm:table-cell">{t('dashboard:analytics.status')}</th>
              </tr>
            </thead>
          </table>
          <div
            className="overflow-y-auto smart-scrollbar"
            style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}
          >
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[35%] sm:w-[28%]" />
                <col className="hidden sm:table-column w-[18%]" />
                <col className="w-[20%] sm:w-[14%]" />
                <col className="w-[25%] sm:w-[20%]" />
                <col className="hidden sm:table-column w-[20%]" />
              </colgroup>
              <tbody>
                {transactions.map((tx) => {
                  const Icon = getCategoryIcon(tx.category);
                  const isPositive = tx.amount > 0;
                  const statusColor = tx.status === 'completed' ? 'text-success' : tx.status === 'pending' ? 'text-warning' : 'text-muted-foreground';

                  return (
                    <tr key={tx.id} className="border-b border-white/10 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">{tx.merchant}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">{t(`dashboard:analytics.categories.${tx.category}`, { defaultValue: tx.category }) || t('dashboard:analytics.others')}</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          isPositive ? "text-success" : "text-foreground"
                        )}>
                          {isPositive ? "+" : ""}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3 text-center hidden sm:table-cell">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", statusColor === 'text-success' ? 'bg-success' : statusColor === 'text-warning' ? 'bg-warning' : 'bg-muted-foreground')} />
                          <span className={cn("text-xs capitalize", statusColor)}>
                            {t(`dashboard:analytics.${tx.status}`, { defaultValue: tx.status })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ChartCard>
  );
};

export default RecentTransactionsTable;
