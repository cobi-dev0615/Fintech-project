import { LucideIcon, TrendingUp, TrendingDown, MoreVertical } from "lucide-react";
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
  /** Accent color for icon tint */
  accent?: AccentVariant;
  /** Show three-dot menu button */
  showMenu?: boolean;
}

const accentStyles: Record<AccentVariant, { icon: string }> = {
  primary: { icon: "bg-primary/10 text-primary" },
  success: { icon: "bg-emerald-500/10 text-emerald-500" },
  info: { icon: "bg-cyan-500/10 text-cyan-500" },
  warning: { icon: "bg-amber-500/10 text-amber-500" },
  muted: { icon: "bg-muted/60 text-muted-foreground" },
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
  showMenu,
}: ProfessionalKpiCardProps) => {
  const styles = accent ? accentStyles[accent] : null;

  return (
    <div className="kpi-card min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                styles?.icon ?? "bg-muted/60"
              )}
              aria-hidden
            >
              <Icon className={cn("h-4 w-4", iconClassName ?? (styles ? "" : "text-muted-foreground"))} />
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground truncate">
            {title}
          </span>
        </div>
        {showMenu && (
          <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground p-0.5 -mr-1 shrink-0 transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="text-2xl sm:text-[28px] font-bold text-foreground mb-1 tabular-nums tracking-tight leading-none">
        {value}
      </div>

      {(change || subtitle) && (
        <div className="flex items-center gap-1.5 mt-2 min-w-0">
          {change && changeType !== "neutral" && (
            <span
              className={cn(
                "flex items-center gap-0.5",
                changeType === "positive" && "text-emerald-400",
                changeType === "negative" && "text-red-400"
              )}
            >
              {changeType === "positive" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span className="text-xs font-semibold tabular-nums">{change}</span>
            </span>
          )}
          {change && changeType === "neutral" && (
            <span className="text-xs font-medium text-muted-foreground tabular-nums">{change}</span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground/70 truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfessionalKpiCard;
