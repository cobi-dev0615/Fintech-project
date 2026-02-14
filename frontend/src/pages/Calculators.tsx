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
    <div className="space-y-6 min-w-0">
      {/* Tab selector */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(`${basePath}/calculators/${tab.id}`)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-muted text-muted-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Calculator panels — all rendered, only active visible */}
      <div className={activeTab === "fire" ? "space-y-6" : "hidden"}><FIRECalculator /></div>
      <div className={activeTab === "compound" ? "space-y-6" : "hidden"}><CompoundInterest /></div>
      <div className={activeTab === "usufruct" ? "space-y-6" : "hidden"}><UsufructCalculator /></div>
      <div className={activeTab === "itcmd" ? "space-y-6" : "hidden"}><ITCMDCalculator /></div>
      <div className={activeTab === "profitability" ? "space-y-6" : "hidden"}><ProfitabilitySimulator /></div>
    </div>
  );
};

export default Calculators;
