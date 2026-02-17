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
    <div className={cn("chart-card min-w-0 h-full flex flex-col", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 mb-5 min-w-0 shrink-0">
          {title && (
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">{subtitle}</p>
              )}
            </div>
          )}
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </div>
      )}
      <div className="w-full flex-1 min-w-0 min-h-0">{children}</div>
    </div>
  );
};

export default ChartCard;
