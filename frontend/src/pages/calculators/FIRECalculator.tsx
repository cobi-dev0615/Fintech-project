import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { TrendingUp, Calculator, Info, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

const FIRECalculator = () => {
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [currentSavings, setCurrentSavings] = useState("");
  const [monthlySavings, setMonthlySavings] = useState("");
  const [annualReturn, setAnnualReturn] = useState("8");
  const [withdrawalRate, setWithdrawalRate] = useState("4");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const calculateFIRE = () => {
    const expenses = parseFloat(monthlyExpenses) || 0;
    const savings = parseFloat(currentSavings) || 0;
    const monthly = parseFloat(monthlySavings) || 0;
    const returnRate = parseFloat(annualReturn) / 100 / 12; // Monthly return
    const withdrawal = parseFloat(withdrawalRate) / 100;

    if (expenses <= 0 || monthly <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, preencha os valores de despesas mensais e economia mensal.",
        variant: "destructive",
      });
      return;
    }

    // FIRE number = Annual expenses / withdrawal rate
    const annualExpenses = expenses * 12;
    const fireNumber = annualExpenses / withdrawal;

    // Calculate years to FIRE
    let current = savings;
    let months = 0;
    const projection: { month: number; value: number }[] = [];

    while (current < fireNumber && months < 600) {
      current = current * (1 + returnRate) + monthly;
      months++;
      if (months % 12 === 0) {
        projection.push({ month: months / 12, value: current });
      }
    }

    const years = months / 12;

    setResults({
      fireNumber,
      years: years > 500 ? null : years,
      monthlyExpenses: expenses,
      annualExpenses,
      projection,
    });
  };

  const location = useLocation();
  const isConsultantRoute = location.pathname.startsWith('/consultant');
  const backPath = isConsultantRoute ? '/consultant/calculators' : '/app/calculators';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={backPath}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calculadora FIRE</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Financial Independence, Retire Early - Calcule quanto precisa para alcançar independência financeira
            </p>
          </div>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          FIRE (Financial Independence, Retire Early) é um movimento que busca alcançar independência financeira
          através de economia agressiva e investimentos. O número FIRE é o valor necessário para viver apenas dos
          rendimentos dos investimentos.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <ChartCard title="Parâmetros de Cálculo">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expenses">Despesas Mensais (R$)</Label>
              <Input
                id="expenses"
                type="number"
                placeholder="5000"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Quanto você gasta por mês atualmente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="savings">Economias Atuais (R$)</Label>
              <Input
                id="savings"
                type="number"
                placeholder="50000"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Valor total que você já tem investido
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly">Economia Mensal (R$)</Label>
              <Input
                id="monthly"
                type="number"
                placeholder="3000"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Quanto você consegue economizar por mês
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return">Retorno Anual Esperado (%)</Label>
              <Input
                id="return"
                type="number"
                placeholder="8"
                value={annualReturn}
                onChange={(e) => setAnnualReturn(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Taxa de retorno anual esperada dos investimentos (padrão: 8%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawal">Taxa de Saque Anual (%)</Label>
              <Input
                id="withdrawal"
                type="number"
                placeholder="4"
                value={withdrawalRate}
                onChange={(e) => setWithdrawalRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Percentual que você pode sacar anualmente sem esgotar o patrimônio (padrão: 4%)
              </p>
            </div>

            <Button onClick={calculateFIRE} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular FIRE
            </Button>
          </div>
        </ChartCard>

        {/* Results */}
        <ChartCard title="Resultados">
          {results ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-sm text-muted-foreground mb-1">Número FIRE</div>
                  <div className="text-3xl font-bold text-primary">
                    R$ {results.fireNumber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Valor necessário para independência financeira
                  </div>
                </div>

                {results.years !== null ? (
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="text-sm text-muted-foreground mb-1">Tempo até FIRE</div>
                    <div className="text-3xl font-bold text-success">
                      {Math.floor(results.years)} anos e {Math.round((results.years % 1) * 12)} meses
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Com base nos parâmetros informados
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="text-sm text-muted-foreground mb-1">Tempo até FIRE</div>
                    <div className="text-xl font-bold text-warning">
                      Mais de 50 anos
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Considere aumentar sua economia mensal ou reduzir despesas
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="text-xs text-muted-foreground">Despesas Anuais</div>
                    <div className="text-lg font-semibold">
                      R$ {results.annualExpenses.toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="text-xs text-muted-foreground">Economias Atuais</div>
                    <div className="text-lg font-semibold">
                      R$ {parseFloat(currentSavings || "0").toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
              </div>

              {results.projection && results.projection.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-4">Projeção de Crescimento</h3>
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
                        name="Patrimônio"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Preencha os campos e clique em "Calcular FIRE" para ver os resultados</p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default FIRECalculator;

