import { useState } from "react";
import { Calculator, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { cn } from "@/lib/utils";

const FIRECalculator = () => {
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
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Calculadora FIRE</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Financial Independence, Retire Early — simule sua independência financeira
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cn("rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow")}>
          <h2 className="text-sm font-semibold text-foreground mb-4">Parâmetros</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Patrimônio atual (R$)</Label>
              <CurrencyInput value={currentSavings} onChange={setCurrentSavings} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Aplicação mensal (R$)</Label>
              <CurrencyInput value={monthlyContribution} onChange={setMonthlyContribution} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Rentabilidade anual (%)</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={annualReturn}
                onChange={(e) => setAnnualReturn(e.target.value)}
                placeholder="Ex: 8"
              />
              <p className="text-xs text-muted-foreground">Ex.: 8 para 8% ao ano</p>
            </div>
            <div className="space-y-2">
              <Label>Gastos mensais (R$)</Label>
              <CurrencyInput value={monthlyExpenses} onChange={setMonthlyExpenses} placeholder="0,00" />
              <p className="text-xs text-muted-foreground">Meta: 25× gastos anuais</p>
            </div>
          </div>
          <Button onClick={calculate} className="mt-5 w-full sm:w-auto" size="lg">
            <Calculator className="h-4 w-4 mr-2" />
            Calcular
          </Button>
        </div>

        <div className={cn("rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow min-h-[200px] flex flex-col")}>
          <h2 className="text-sm font-semibold text-foreground mb-4">Resultado</h2>
          {result ? (
            <div className="flex flex-col gap-3 flex-1">
              <p className="text-sm text-muted-foreground">Tempo para atingir 25× seus gastos anuais:</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.floor(result.months / 12)} anos e {result.months % 12} meses
              </p>
              <p className="text-sm text-muted-foreground">
                Patrimônio projetado: {result.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os campos e clique em &quot;Calcular&quot; para ver o resultado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FIRECalculator;
