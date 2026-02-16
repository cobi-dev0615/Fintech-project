import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Calculator, TrendingUp, Home, Coins, Percent } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import FIRECalculator from "./calculators/FIRECalculator";
import CompoundInterest from "./calculators/CompoundInterest";
import UsufructCalculator from "./calculators/UsufructCalculator";
import ITCMDCalculator from "./calculators/ITCMDCalculator";
import ProfitabilitySimulator from "./calculators/ProfitabilitySimulator";

const TABS = [
  { id: "fire", icon: TrendingUp, labelKey: "fire.title" },
  { id: "compound", icon: Calculator, labelKey: "compoundInterest.title" },
  { id: "usufruct", icon: Home, labelKey: "usufruct.title" },
  { id: "itcmd", icon: Coins, labelKey: "itcmd.title" },
  { id: "profitability", icon: Percent, labelKey: "profitability.title" },
];

const Calculators = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(["calculators"]);
  const basePath = location.pathname.startsWith("/consultant") ? "/consultant" : "/app";
  const activeTab = type || "fire";

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden flex-1 flex flex-col justify-center">
      <div className="chart-card !p-0 overflow-hidden min-w-0">
        <div className="flex flex-col lg:flex-row min-w-0">
          {/* Sidebar tab navigation */}
          <div className="w-full lg:w-52 shrink-0 border-b lg:border-b-0 lg:border-r border-white/10">
            <nav className="flex flex-row lg:flex-col gap-0.5 overflow-x-auto p-3 lg:py-6" aria-label={t("calculators:fire.title")}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigate(`${basePath}/calculators/${tab.id}`)}
                    className={cn(
                      "relative text-left px-4 py-2.5 text-sm font-medium transition-colors shrink-0 lg:shrink rounded-md flex items-center gap-2.5",
                      isActive
                        ? "text-primary bg-primary/15 dark:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    {/* Active left border indicator (desktop) */}
                    {isActive && (
                      <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary hidden lg:block" />
                    )}
                    {/* Active bottom border (mobile) */}
                    {isActive && (
                      <span className="absolute left-1 right-1 bottom-0 h-[2px] rounded-full bg-primary lg:hidden" />
                    )}
                    <tab.icon className="h-4 w-4 shrink-0" />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0 p-4 lg:p-6">
            <div className={activeTab === "fire" ? "space-y-6" : "hidden"}><FIRECalculator /></div>
            <div className={activeTab === "compound" ? "space-y-6" : "hidden"}><CompoundInterest /></div>
            <div className={activeTab === "usufruct" ? "space-y-6" : "hidden"}><UsufructCalculator /></div>
            <div className={activeTab === "itcmd" ? "space-y-6" : "hidden"}><ITCMDCalculator /></div>
            <div className={activeTab === "profitability" ? "space-y-6" : "hidden"}><ProfitabilitySimulator /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculators;
