import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfessionalKpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  subtitle?: string;
}

const ProfessionalKpiCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  subtitle,
}: ProfessionalKpiCardProps) => {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="text-2xl font-bold text-foreground mb-1 tabular-nums">
        {value}
      </div>

      {(change || subtitle) && (
        <div className="flex items-center gap-2 mt-1">
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
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfessionalKpiCard;
