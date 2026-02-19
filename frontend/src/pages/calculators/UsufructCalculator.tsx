import { useState } from "react";
import { Home, Calculator, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";

const UsufructCalculator = () => {
  const { formatCurrency } = useCurrency();
  const { t } = useTranslation(['calculators', 'common']);
  const [propertyValue, setPropertyValue] = useState<number | "">("");
  const [usufructAge, setUsufructAge] = useState("");
  const [usufructType, setUsufructType] = useState<"temporary" | "lifelong">("lifelong");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const calculate = () => {
    const value = typeof propertyValue === "number" ? propertyValue : 0;
    const age = parseFloat(usufructAge) || 0;

    if (value <= 0 || age <= 0) {
      toast({
        title: t('common:error'),
        description: t('calculators:usufruct.validationError'),
        variant: "warning",
      });
      return;
    }

    let usufructPercentage = 0;

    if (usufructType === "lifelong") {
      if (age <= 20) usufructPercentage = 32;
      else if (age <= 30) usufructPercentage = 31;
      else if (age <= 40) usufructPercentage = 30;
      else if (age <= 43) usufructPercentage = 29;
      else if (age <= 46) usufructPercentage = 28;
      else if (age <= 49) usufructPercentage = 27;
      else if (age <= 52) usufructPercentage = 26;
      else if (age <= 55) usufructPercentage = 25;
      else if (age <= 58) usufructPercentage = 24;
      else if (age <= 61) usufructPercentage = 23;
      else if (age <= 64) usufructPercentage = 22;
      else if (age <= 67) usufructPercentage = 21;
      else if (age <= 70) usufructPercentage = 20;
      else if (age <= 73) usufructPercentage = 19;
      else if (age <= 76) usufructPercentage = 18;
      else if (age <= 79) usufructPercentage = 17;
      else if (age <= 82) usufructPercentage = 16;
      else if (age <= 85) usufructPercentage = 15;
      else if (age <= 88) usufructPercentage = 14;
      else if (age <= 91) usufructPercentage = 13;
      else usufructPercentage = 12;
    } else {
      const years = Math.min(age, 15);
      usufructPercentage = Math.min(years * 2, 30);
    }

    const usufructValue = (value * usufructPercentage) / 100;
    const bareOwnershipValue = value - usufructValue;

    setResults({
      propertyValue: value,
      usufructPercentage,
      usufructValue,
      bareOwnershipValue,
      usufructType,
    });
  };

  return (
    <>
      <Alert className="rounded-xl border border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {t("calculators:usufruct.info")}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parameters */}
        <div className="chart-card">
          <div className="flex items-center gap-2.5 mb-5">
            <Calculator className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("calculators:usufruct.parameters")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("calculators:usufruct.parametersDesc")}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">{t("calculators:usufruct.propertyValue")}</Label>
              <CurrencyInput id="value" value={propertyValue} onChange={setPropertyValue} placeholder="500.000,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">{t("calculators:usufruct.usufructType")}</Label>
              <Select value={usufructType} onValueChange={(v: any) => setUsufructType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lifelong">{t("calculators:usufruct.lifelong")}</SelectItem>
                  <SelectItem value="temporary">{t("calculators:usufruct.temporary")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">
                {usufructType === "lifelong" ? t("calculators:usufruct.ageLabel") : t("calculators:usufruct.durationLabel")}
              </Label>
              <Input
                id="age"
                type="number"
                placeholder={usufructType === "lifelong" ? "65" : "10"}
                value={usufructAge}
                onChange={(e) => setUsufructAge(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {usufructType === "lifelong" ? t("calculators:usufruct.ageHint") : t("calculators:usufruct.durationHint")}
              </p>
            </div>
            <Button onClick={calculate} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              {t("calculators:usufruct.calculate")}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="chart-card min-h-[280px] flex flex-col">
          <div className="flex items-center gap-2.5 mb-5">
            <Home className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("calculators:usufruct.resultsTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("calculators:usufruct.resultsDesc")}</p>
            </div>
          </div>
          {results ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">{t("calculators:usufruct.usufructValue")}</div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(results.usufructValue)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {t("calculators:usufruct.ofPropertyValue", { percentage: results.usufructPercentage })}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-sm text-muted-foreground mb-1">{t("calculators:usufruct.bareOwnership")}</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(results.bareOwnershipValue)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {t("calculators:usufruct.ofPropertyValue", { percentage: 100 - results.usufructPercentage })}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/40">
                <div className="text-xs text-muted-foreground">{t("calculators:usufruct.totalPropertyValue")}</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(results.propertyValue)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
              <Home className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">{t("calculators:usufruct.noResult")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("calculators:usufruct.noResultHint")}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UsufructCalculator;
