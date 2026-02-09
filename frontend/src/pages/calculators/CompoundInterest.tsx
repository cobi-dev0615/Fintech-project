import { useState } from "react";
import { TrendingUp, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";

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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Juros compostos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simule o crescimento do seu investimento com aportes e juros compostos
        </p>
      </div>

      <ChartCard title="Parâmetros">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Valor inicial (R$)</Label>
            <CurrencyInput
              value={initialAmount}
              onChange={setInitialAmount}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Aporte mensal (R$)</Label>
            <CurrencyInput
              value={monthlyContribution}
              onChange={setMonthlyContribution}
              placeholder="0,00"
            />
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
          </div>
        </div>
        <Button onClick={calculate} className="mt-4">
          <Calculator className="h-4 w-4 mr-2" />
          Calcular
        </Button>
      </ChartCard>

      {result !== null && (
        <ChartCard title="Montante final">
          <p className="text-2xl font-bold text-foreground">
            {result.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </ChartCard>
      )}
    </div>
  );
};

export default CompoundInterest;
