import { useState } from "react";
import { Coins, Calculator, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";

const ITCMDCalculator = () => {
  const { formatCurrency } = useCurrency();
  const { t } = useTranslation(['calculators', 'common']);
  const [propertyValue, setPropertyValue] = useState<number | "">("");
  const [state, setState] = useState("SP");
  const [transactionType, setTransactionType] = useState<"inheritance" | "donation">("inheritance");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  // ITCMD rates by state (simplified - rates vary by value brackets)
  const stateRates: Record<string, { inheritance: number; donation: number }> = {
    SP: { inheritance: 4, donation: 4 },
    RJ: { inheritance: 4, donation: 4 },
    MG: { inheritance: 4, donation: 4 },
    RS: { inheritance: 5, donation: 5 },
    PR: { inheritance: 4, donation: 4 },
    SC: { inheritance: 4, donation: 4 },
    BA: { inheritance: 4, donation: 4 },
    GO: { inheritance: 4, donation: 4 },
    PE: { inheritance: 4, donation: 4 },
    CE: { inheritance: 4, donation: 4 },
  };

  const calculate = () => {
    const value = typeof propertyValue === "number" ? propertyValue : 0;

    if (value <= 0) {
      toast({
        title: t('common:error'),
        description: t('calculators:itcmd.validationError'),
        variant: "destructive",
      });
      return;
    }

    const rate = stateRates[state]?.[transactionType] || 4;
    const tax = (value * rate) / 100;

    setResults({
      propertyValue: value,
      state,
      transactionType,
      rate,
      tax,
    });
  };

  return (
    <>
      <Alert className="rounded-xl border border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {t("calculators:itcmd.info")}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parameters */}
        <div className="chart-card">
          <div className="flex items-center gap-2.5 mb-5">
            <Calculator className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("calculators:itcmd.parameters")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("calculators:itcmd.parametersDesc")}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">{t("calculators:itcmd.propertyValue")}</Label>
              <CurrencyInput id="value" value={propertyValue} onChange={setPropertyValue} placeholder="500.000,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">{t("calculators:itcmd.transactionType")}</Label>
              <Select value={transactionType} onValueChange={(v: any) => setTransactionType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inheritance">{t("calculators:itcmd.inheritance")}</SelectItem>
                  <SelectItem value="donation">{t("calculators:itcmd.donation")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">{t("calculators:itcmd.state")}</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(stateRates).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("calculators:itcmd.stateHint")}</p>
            </div>
            <Button onClick={calculate} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              {t("calculators:itcmd.calculate")}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="chart-card min-h-[280px] flex flex-col">
          <div className="flex items-center gap-2.5 mb-5">
            <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("calculators:itcmd.resultsTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("calculators:itcmd.resultsDesc")}</p>
            </div>
          </div>
          {results ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">{t("calculators:itcmd.taxLabel")}</div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(results.tax)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {t("calculators:itcmd.rate", { rate: results.rate })}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/40">
                <div className="text-xs text-muted-foreground">{t("calculators:itcmd.assetValue")}</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(results.propertyValue)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground">{t("calculators:itcmd.stateLabel")}</div>
                  <div className="text-lg font-semibold">{results.state}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground">{t("calculators:itcmd.typeLabel")}</div>
                  <div className="text-lg font-semibold">
                    {results.transactionType === "inheritance" ? t("calculators:itcmd.inheritanceLabel") : t("calculators:itcmd.donationLabel")}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
              <Coins className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">{t("calculators:itcmd.noResult")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("calculators:itcmd.noResultHint")}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ITCMDCalculator;
