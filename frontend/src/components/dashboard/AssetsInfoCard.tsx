import { Wallet, TrendingUp, CreditCard, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from "@/contexts/CurrencyContext";

interface AssetsInfoCardProps {
  netWorth: number;
  available: number;
  invested: number;
  cardDebt: number;
}

export function AssetsInfoCard({ netWorth, available, invested, cardDebt }: AssetsInfoCardProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { formatCurrency } = useCurrency();

  const assets = [
    {
      label: t('dashboard:netWorth', { defaultValue: 'Net Worth' }),
      value: netWorth,
      icon: DollarSign,
      color: 'text-success bg-success/10',
    },
    {
      label: t('dashboard:available', { defaultValue: 'Available' }),
      value: available,
      icon: Wallet,
      color: 'text-primary bg-primary/10',
    },
    {
      label: t('dashboard:invested', { defaultValue: 'Invested' }),
      value: invested,
      icon: TrendingUp,
      color: 'text-info bg-info/10',
    },
    {
      label: t('dashboard:cardDebt', { defaultValue: 'Card Debt' }),
      value: cardDebt,
      icon: CreditCard,
      color: 'text-destructive bg-destructive/10',
    },
  ];

  return (
    <div className="kpi-card group cursor-default">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {t('dashboard:assetsOverview', { defaultValue: 'Assets Overview' })}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {assets.map((asset) => {
          const Icon = asset.icon;
          return (
            <div
              key={asset.label}
              className="flex flex-col gap-2 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${asset.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs text-muted-foreground">{asset.label}</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {formatCurrency(asset.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
