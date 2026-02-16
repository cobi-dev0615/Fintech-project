import { useState } from "react";
import { Calculator, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";

const FIRECalculator = () => {
  const { formatCurrency } = useCurrency();
  const { t } = useTranslation(["calculators", "common"]);
  const [currentSavings, setCurrentSavings] = useState<number | "">("");
  const [monthlyContribution, setMonthlyContribution] = useState<number | "">("");
  const [annualReturn, setAnnualReturn] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState<number | "">("");
  const [result, setResult] = useState<{ months: number; amount: number } | null>(null);

  const calculate = () => {
    const savings = currentSavings === "" ? 0 : currentSavings;
    const monthly = monthlyContribution === "" ? 0 : monthlyContribution;
    const rate = parseFloat(annualReturn) || 0;
    const expenses = monthlyExpenses === "" ? 0 : monthlyExpenses;
    if (expenses <= 0 || (savings <= 0 && monthly <= 0)) return;
    const monthlyRate = rate / 100 / 12;
    const target = expenses * 300; // 25x annual expenses
    let balance = savings;
    let months = 0;
    const maxMonths = 600;
    while (balance < target && months < maxMonths) {
      balance = balance * (1 + monthlyRate) + monthly;
      months++;
    }
    setResult({ months, amount: balance });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Parameters */}
      <div className="chart-card">
        <div className="flex items-center gap-2.5 mb-5">
          <Calculator className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("calculators:fire.parameters")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("calculators:fire.parametersDesc")}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("calculators:fire.currentSavings")}</Label>
            <CurrencyInput value={currentSavings} onChange={setCurrentSavings} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>{t("calculators:fire.monthlyContribution")}</Label>
            <CurrencyInput value={monthlyContribution} onChange={setMonthlyContribution} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>{t("calculators:fire.annualReturn")}</Label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={annualReturn}
              onChange={(e) => setAnnualReturn(e.target.value)}
              placeholder="Ex: 8"
            />
            <p className="text-xs text-muted-foreground">{t("calculators:fire.annualReturnHint")}</p>
          </div>
          <div className="space-y-2">
            <Label>{t("calculators:fire.monthlyExpenses")}</Label>
            <CurrencyInput value={monthlyExpenses} onChange={setMonthlyExpenses} placeholder="0,00" />
            <p className="text-xs text-muted-foreground">{t("calculators:fire.monthlyExpensesHint")}</p>
          </div>
        </div>
        <Button onClick={calculate} className="mt-5 w-full sm:w-auto" size="lg">
          <Calculator className="h-4 w-4 mr-2" />
          {t("calculators:fire.calculate")}
        </Button>
      </div>

      {/* Result */}
      <div className="chart-card min-h-[200px] flex flex-col">
        <div className="flex items-center gap-2.5 mb-5">
          <Target className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("calculators:fire.resultTitle")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("calculators:fire.resultDesc")}</p>
          </div>
        </div>
        {result ? (
          <div className="flex flex-col gap-3 flex-1">
            <p className="text-sm text-muted-foreground">{t("calculators:fire.timeToFire")}</p>
            <p className="text-2xl font-bold text-foreground">
              {t("calculators:fire.yearsAndMonths", {
                years: Math.floor(result.months / 12),
                months: result.months % 12,
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("calculators:fire.projectedWealth")} {formatCurrency(result.amount)}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground">{t("calculators:fire.noResult")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("calculators:fire.noResultHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FIRECalculator;
