import { UserCheck, Mail, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConsultantInfoCardProps {
  name: string;
  email: string;
  isPrimary: boolean;
}

export function ConsultantInfoCard({ name, email, isPrimary }: ConsultantInfoCardProps) {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div className="kpi-card group cursor-default">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors">
          <UserCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-muted-foreground truncate">
            {t('dashboard:yourConsultant', { defaultValue: 'Your Consultant' })}
          </h3>
          <p className="text-base font-bold text-foreground mt-1 flex items-center gap-2 truncate">
            {name}
            {isPrimary && (
              <Star className="h-4 w-4 shrink-0 fill-primary text-primary" />
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/40">
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <Mail className="h-4 w-4 shrink-0" />
          <a
            href={`mailto:${email}`}
            className="text-foreground hover:text-primary transition-colors hover:underline truncate"
          >
            {email}
          </a>
        </div>
        {isPrimary && (
          <div className="mt-2 text-xs text-muted-foreground truncate">
            {t('dashboard:primaryConsultant', { defaultValue: 'Primary financial advisor' })}
          </div>
        )}
      </div>
    </div>
  );
}
