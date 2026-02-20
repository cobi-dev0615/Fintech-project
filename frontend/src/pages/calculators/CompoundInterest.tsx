import { useState } from "react";
import { Calculator, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";

const CompoundInterest = () => {
  const { formatCurrency } = useCurrency();
  const { t } = useTranslation(["calculators", "common"]);
  const [initialAmount, setInitialAmount] = useState<number | "">("");
  const [monthlyContribution, setMonthlyContribution] = useState<number | "">("");
  const [annualRate, setAnnualRate] = useState("");
  const [months, setMonths] = useState("");
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const P = initialAmount === "" ? 0 : initialAmount;
    const PMT = monthlyContribution === "" ? 0 : monthlyContribution;
    const r = (parseFloat(annualRate) || 0) / 100 / 12;
    const n = parseInt(months, 10) || 0;
    if (n <= 0) return;
    let FV = P * Math.pow(1 + r, n);
    if (PMT > 0 && r > 0) {
      FV += PMT * ((Math.pow(1 + r, n) - 1) / r);
    } else if (PMT > 0) {
      FV += PMT * n;
    }
    setResult(FV);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Parameters */}
      <div className="chart-card">
        <div className="flex items-center gap-2.5 mb-5">
          <Calculator className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("calculators:compoundInterest.parameters")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("calculators:compoundInterest.parametersDesc")}</p>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>{t("calculators:compoundInterest.initialAmount")}</Label>
            <CurrencyInput value={initialAmount} onChange={setInitialAmount} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>{t("calculators:compoundInterest.monthlyContribution")}</Label>
            <CurrencyInput value={monthlyContribution} onChange={setMonthlyContribution} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>{t("calculators:compoundInterest.annualRate")}</Label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              placeholder="Ex: 10"
            />
            <p className="text-xs text-muted-foreground">{t("calculators:compoundInterest.annualRateHint")}</p>
          </div>
          <div className="space-y-2">
            <Label>{t("calculators:compoundInterest.termMonths")}</Label>
            <Input
              type="number"
              min={1}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              placeholder="Ex: 120"
            />
            <p className="text-xs text-muted-foreground">{t("calculators:compoundInterest.termMonthsHint")}</p>
          </div>
        </div>
        <Button onClick={calculate} className="mt-5 w-full sm:w-auto" size="lg">
          <Calculator className="h-4 w-4 mr-2" />
          {t("calculators:compoundInterest.calculate")}
        </Button>
      </div>

      {/* Result */}
      <div className="chart-card min-h-[200px] flex flex-col">
        <div className="flex items-center gap-2.5 mb-5">
          <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("calculators:compoundInterest.resultTitle")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("calculators:compoundInterest.resultDesc")}</p>
          </div>
        </div>
        {result !== null ? (
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(result)}
            </p>
            <p className="text-sm text-muted-foreground">{t("calculators:compoundInterest.projectedValue")}</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground">{t("calculators:compoundInterest.noResult")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("calculators:compoundInterest.noResultHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompoundInterest;
