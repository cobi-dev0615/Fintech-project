import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import ChartCard from "./ChartCard";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";

interface SpendingByCategoryChartProps {
  data: Array<{ category: string; total: number; percentage: number }>;
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#06b6d4', '#6b7280'];

const SpendingByCategoryChart = ({ data, loading }: SpendingByCategoryChartProps) => {
  const { t } = useTranslation(['dashboard']);
  const { formatCurrency } = useCurrency();

  const grandTotal = data.reduce((sum, d) => sum + d.total, 0);
  const topCategory = data[0];

  return (
    <ChartCard title={t('dashboard:analytics.spendingByCategory')}>
      <div className="flex flex-col items-center">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            {t('dashboard:analytics.noData')}
          </div>
        ) : (
          <>
            <div className="w-full h-44 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="total"
                    stroke="none"
                  >
                    {data.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              {topCategory && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-foreground">{topCategory.percentage}%</span>
                  <span className="text-[10px] text-muted-foreground">{topCategory.category}</span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="w-full space-y-2 mt-2">
              {data.map((item, idx) => (
                <div key={item.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-muted-foreground truncate">{item.category}</span>
                  </div>
                  <span className="text-foreground font-medium tabular-nums ml-2">{item.percentage}%</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between w-full mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">{t('dashboard:analytics.totalExpenses')}</span>
              <span className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </>
        )}
      </div>
    </ChartCard>
  );
};

export default SpendingByCategoryChart;
