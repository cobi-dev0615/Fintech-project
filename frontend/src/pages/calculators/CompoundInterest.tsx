import { useState } from "react";
import { Calculator, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const CompoundInterest = () => {
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
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Juros compostos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simule o crescimento do seu investimento com aportes e juros compostos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cn("rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow")}>
          <h2 className="text-sm font-semibold text-foreground mb-4">Parâmetros</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Valor inicial (R$)</Label>
              <CurrencyInput value={initialAmount} onChange={setInitialAmount} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Aporte mensal (R$)</Label>
              <CurrencyInput value={monthlyContribution} onChange={setMonthlyContribution} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Taxa de juros anual (%)</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                placeholder="Ex: 10"
              />
              <p className="text-xs text-muted-foreground">Ex.: 10 para 10% ao ano</p>
            </div>
            <div className="space-y-2">
              <Label>Prazo (meses)</Label>
              <Input
                type="number"
                min={1}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="Ex: 120"
              />
              <p className="text-xs text-muted-foreground">Ex.: 120 = 10 anos</p>
            </div>
          </div>
          <Button onClick={calculate} className="mt-5 w-full sm:w-auto" size="lg">
            <Calculator className="h-4 w-4 mr-2" />
            Calcular
          </Button>
        </div>

        <div className={cn("rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow min-h-[200px] flex flex-col")}>
          <h2 className="text-sm font-semibold text-foreground mb-4">Montante final</h2>
          {result !== null ? (
            <div className="flex flex-col gap-2 flex-1">
              <p className="text-2xl font-bold text-foreground">
                {result.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="text-sm text-muted-foreground">Valor projetado ao final do prazo</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os campos e clique em &quot;Calcular&quot; para ver o resultado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompoundInterest;
