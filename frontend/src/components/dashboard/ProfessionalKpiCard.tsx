import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfessionalKpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  iconClassName?: string;
  subtitle?: string;
}

const ProfessionalKpiCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconClassName,
  subtitle,
}: ProfessionalKpiCardProps) => {
  return (
    <div className="kpi-card min-w-0">
      <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0" aria-hidden>
            <Icon className={cn("h-4 w-4", iconClassName ?? "text-muted-foreground")} />
          </div>
        )}
      </div>

      <div className="text-xl sm:text-2xl font-bold text-foreground mb-0.5 sm:mb-1 tabular-nums break-all min-h-[1.5em]">
        {value}
      </div>

      {(change || subtitle) && (
        <div className="flex items-center gap-2 mt-1 flex-wrap min-w-0">
          {change && (
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfessionalKpiCard;
