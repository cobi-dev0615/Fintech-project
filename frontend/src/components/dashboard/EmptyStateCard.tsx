import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmptyStateCardProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyStateCard({ title, icon: Icon }: EmptyStateCardProps) {
  const { t } = useTranslation('common');

  return (
    <div className="kpi-card group cursor-default flex flex-col items-center justify-center min-h-[120px]">
      <div className="flex flex-col items-center gap-3 text-center">
        {Icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/20 text-muted-foreground">
            <Icon className="h-5 w-5" />
          </div>
        ) : (
          <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
        )}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground/60">
            {t('noData', { defaultValue: 'No content to display' })}
          </p>
        </div>
      </div>
    </div>
  );
}
