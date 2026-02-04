import { useState } from "react";
import { Calculator, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

const CompoundInterest = () => {
  const [initialAmount, setInitialAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [interestRate, setInterestRate] = useState("8");
  const [timePeriod, setTimePeriod] = useState("");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const calculate = () => {
    const principal = parseFloat(initialAmount) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const rate = parseFloat(interestRate) / 100 / 12; // Monthly rate
    const months = parseFloat(timePeriod) || 0;

    if (months <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, informe um período válido.",
        variant: "destructive",
      });
      return;
    }

    let balance = principal;
    const projection: { month: number; value: number }[] = [];
    const yearlyData: { year: number; value: number; contributions: number; interest: number }[] = [];

    let totalContributions = principal;
    let totalInterest = 0;

    for (let month = 0; month <= months; month++) {
      if (month > 0) {
        balance = balance * (1 + rate) + monthly;
        totalContributions += monthly;
      }

      if (month % 12 === 0) {
        const year = month / 12;
        const interestEarned = balance - totalContributions;
        projection.push({ month: year, value: balance });
        yearlyData.push({
          year,
          value: balance,
          contributions: totalContributions,
          interest: interestEarned,
        });
      }
    }

    totalInterest = balance - totalContributions;

    setResults({
      finalValue: balance,
      totalContributions,
      totalInterest,
      projection,
      yearlyData,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calculadora de Juros Compostos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calcule o valor futuro de seus investimentos com juros compostos
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Juros compostos são calculados sobre o valor inicial mais os juros acumulados. Com o tempo,
          isso resulta em crescimento exponencial do seu patrimônio.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Parâmetros">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="initial">Valor Inicial (R$)</Label>
              <CurrencyInput
                id="initial"
                value={initialAmount}
                onChange={setInitialAmount}
                placeholder="10.000,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly">Aporte Mensal (R$)</Label>
              <CurrencyInput
                id="monthly"
                value={monthlyContribution}
                onChange={setMonthlyContribution}
                placeholder="500,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Taxa de Juros Anual (%)</Label>
              <Input
                id="rate"
                type="number"
                placeholder="8"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Período (anos)</Label>
              <Input
                id="period"
                type="number"
                placeholder="10"
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
              />
            </div>

            <Button onClick={calculate} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular
            </Button>
          </div>
        </ChartCard>

        <ChartCard title="Resultados">
          {results ? (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Valor Final</div>
                <div className="text-3xl font-bold text-primary">
                  R$ {results.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground">Total Investido</div>
                  <div className="text-lg font-semibold">
                    R$ {results.totalContributions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground">Juros Ganhos</div>
                  <div className="text-lg font-semibold text-success">
                    R$ {results.totalInterest.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {results.projection && results.projection.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-4">Evolução do Investimento</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={results.projection}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Valor Total"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Preencha os campos e clique em "Calcular" para ver os resultados</p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default CompoundInterest;

