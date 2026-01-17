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
    <div className={cn("chart-card", className)}>
      {(title || actions) && (
      <div className="flex items-start justify-between mb-4">
          {title && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
          )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      )}
      <div className="w-full">{children}</div>
    </div>
  );
};

export default ChartCard;
