import { useState } from "react";
import { Coins, Calculator, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Calculadora ITCMD</h1>
        <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
          Calcule o Imposto de Transmissão Causa Mortis e Doação
        </p>
      </div>

      <Alert className="rounded-xl border border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          ITCMD (Imposto de Transmissão Causa Mortis e Doação) é um imposto estadual cobrado sobre
          heranças e doações. As alíquotas variam por estado e podem ter faixas de valor.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cn("rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0")}>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Parâmetros</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Valor do bem, tipo e estado</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor do Bem (R$)</Label>
              <CurrencyInput id="value" value={propertyValue} onChange={setPropertyValue} placeholder="500.000,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Transmissão</Label>
              <Select value={transactionType} onValueChange={(v: any) => setTransactionType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inheritance">Causa Mortis (Herança)</SelectItem>
                  <SelectItem value="donation">Doação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
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
              <p className="text-xs text-muted-foreground">Alíquotas variam por UF</p>
            </div>
            <Button onClick={calculate} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular
            </Button>
          </div>
        </div>

        <div className={cn("rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow min-h-[280px] flex flex-col min-w-0")}>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Resultados</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Imposto e alíquota aplicada</p>
            </div>
          </div>
          {results ? (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Imposto ITCMD</div>
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(results.tax)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Alíquota: {results.rate}%
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <div className="text-xs text-muted-foreground">Valor do Bem</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(results.propertyValue)}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <div className="text-xs text-muted-foreground">Estado</div>
                <div className="text-lg font-semibold">{results.state}</div>
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <div className="text-xs text-muted-foreground">Tipo</div>
                <div className="text-lg font-semibold">
                  {results.transactionType === "inheritance" ? "Herança" : "Doação"}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
              <Coins className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">Nenhum resultado ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Preencha os parâmetros e clique em &quot;Calcular&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ITCMDCalculator;

