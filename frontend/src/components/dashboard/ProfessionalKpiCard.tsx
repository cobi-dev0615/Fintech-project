import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AccentVariant = "primary" | "success" | "info" | "warning" | "muted";

interface ProfessionalKpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  iconClassName?: string;
  subtitle?: string;
  /** Accent color for left border and icon tint */
  accent?: AccentVariant;
}

const accentStyles: Record<AccentVariant, { border: string; icon: string }> = {
  primary: { border: "border-l-primary", icon: "bg-primary/10 text-primary" },
  success: { border: "border-l-emerald-500", icon: "bg-emerald-500/10 text-emerald-500" },
  info: { border: "border-l-cyan-500", icon: "bg-cyan-500/10 text-cyan-500" },
  warning: { border: "border-l-amber-500", icon: "bg-amber-500/10 text-amber-500" },
  muted: { border: "border-l-muted-foreground/40", icon: "bg-muted/60 text-muted-foreground" },
};

const ProfessionalKpiCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconClassName,
  subtitle,
  accent,
}: ProfessionalKpiCardProps) => {
  const styles = accent ? accentStyles[accent] : null;
  return (
    <div className={cn("kpi-card min-w-0 border-l-4 border-l-transparent", styles?.border)}>
      <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
          {title}
        </span>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-border/50", styles?.icon ?? "bg-muted/60")} aria-hidden>
            <Icon className={cn("h-4 w-4", iconClassName ?? (styles ? "" : "text-muted-foreground"))} />
          </div>
        )}
      </div>

      <div className="text-xl sm:text-2xl font-bold text-foreground mb-0.5 sm:mb-1 tabular-nums break-all min-h-[1.5em] tracking-tight">
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
