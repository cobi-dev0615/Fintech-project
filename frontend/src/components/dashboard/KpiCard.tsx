import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  subtitle?: string;
}

const KpiCard = ({ title, value, change, changeType = "neutral", icon: Icon, subtitle }: KpiCardProps) => {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 transition-all duration-300 hover:border-orange-500/50 hover:shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-gray-400 font-medium">{title}</span>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-gray-700 flex items-center justify-center">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </div>
      
      <div className="text-2xl md:text-3xl font-bold text-white mb-1">
        {value}
      </div>
      
      {(change || subtitle) && (
        <div className="flex items-center gap-2">
          {change && (
            <span
              className={cn(
                "text-sm font-medium",
                changeType === "positive" && "text-green-400",
                changeType === "negative" && "text-red-400",
                changeType === "neutral" && "text-gray-400"
              )}
            >
              {change}
            </span>
          )}
          {subtitle && (
            <span className="text-sm text-gray-500">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default KpiCard;
