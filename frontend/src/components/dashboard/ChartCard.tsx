import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

const ChartCard = ({ title, subtitle, children, className, actions }: ChartCardProps) => {
  return (
    <div className={cn("chart-card min-w-0", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 mb-4 min-w-0">
          {title && (
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </div>
      )}
      <div className="w-full h-full min-w-0 overflow-hidden">{children}</div>
    </div>
  );
};

export default ChartCard;
