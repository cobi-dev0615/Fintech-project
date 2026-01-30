import { useState } from "react";
import { Percent, Calculator, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

const ProfitabilitySimulator = () => {
  const [initialAmount, setInitialAmount] = useState("");
  const [scenarios, setScenarios] = useState([
    { name: "Conservador", rate: "6", color: "#10b981" },
    { name: "Moderado", rate: "10", color: "#3b82f6" },
    { name: "Arrojado", rate: "15", color: "#8b5cf6" },
  ]);
  const [timePeriod, setTimePeriod] = useState("10");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const calculate = () => {
    const principal = parseFloat(initialAmount) || 0;
    const years = parseFloat(timePeriod) || 0;

    if (principal <= 0 || years <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, preencha os valores corretamente.",
        variant: "destructive",
      });
      return;
    }

    const comparison = scenarios.map((scenario) => {
      const rate = parseFloat(scenario.rate) / 100;
      const finalValue = principal * Math.pow(1 + rate, years);
      const profit = finalValue - principal;
      const profitPercentage = (profit / principal) * 100;

      return {
        name: scenario.name,
        rate: parseFloat(scenario.rate),
        finalValue,
        profit,
        profitPercentage,
        color: scenario.color,
      };
    });

    setResults({
      initialAmount: principal,
      years,
      comparison,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Simulador de Rentabilidade</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare diferentes cenários de investimento e rentabilidade
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Compare diferentes perfis de investimento (Conservador, Moderado, Arrojado) e veja como
          seu patrimônio pode crescer em cada cenário.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Parâmetros">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor Inicial (R$)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="10000"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
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

            <div className="space-y-3">
              <Label>Cenários de Rentabilidade</Label>
              {scenarios.map((scenario, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={scenario.name}
                    onChange={(e) => {
                      const newScenarios = [...scenarios];
                      newScenarios[index].name = e.target.value;
                      setScenarios(newScenarios);
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={scenario.rate}
                    onChange={(e) => {
                      const newScenarios = [...scenarios];
                      newScenarios[index].rate = e.target.value;
                      setScenarios(newScenarios);
                    }}
                    className="w-24"
                    placeholder="%"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              ))}
            </div>

            <Button onClick={calculate} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              Simular
            </Button>
          </div>
        </ChartCard>

        <ChartCard title="Comparação de Cenários">
          {results ? (
            <div className="space-y-6">
              <div className="space-y-4">
                {results.comparison.map((scenario: any, index: number) => (
                  <div key={index} className="p-4 rounded-lg border" style={{ borderColor: scenario.color }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-foreground">{scenario.name}</div>
                        <div className="text-xs text-muted-foreground">{scenario.rate}% ao ano</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: scenario.color }}>
                          R$ {scenario.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          +{scenario.profitPercentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Lucro: R$ {scenario.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-4">Comparação Visual</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={results.comparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`} />
                    <Legend />
                    <Bar dataKey="finalValue" fill="#3b82f6" name="Valor Final" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Preencha os campos e clique em "Simular" para ver os resultados</p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default ProfitabilitySimulator;

