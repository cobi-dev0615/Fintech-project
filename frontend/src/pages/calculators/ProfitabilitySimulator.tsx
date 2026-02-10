import { useState } from "react";
import { Calculator, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ProfitabilitySimulator = () => {
  const [initialAmount, setInitialAmount] = useState<number | "">("");
  const [scenarios, setScenarios] = useState([
    { name: "Conservador", rate: "6", color: "#10b981" },
    { name: "Moderado", rate: "10", color: "#3b82f6" },
    { name: "Arrojado", rate: "15", color: "#8b5cf6" },
  ]);
  const [timePeriod, setTimePeriod] = useState("10");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const calculate = () => {
    const principal = typeof initialAmount === "number" ? initialAmount : 0;
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
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Simulador de Rentabilidade</h1>
        <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
          Compare diferentes cenários de investimento e rentabilidade
        </p>
      </div>

      <Alert className="rounded-xl border border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Compare diferentes perfis de investimento (Conservador, Moderado, Arrojado) e veja como
          seu patrimônio pode crescer em cada cenário.
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
              <p className="text-xs text-muted-foreground mt-0.5">Valor inicial, período e cenários</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor Inicial (R$)</Label>
              <CurrencyInput id="amount" value={initialAmount} onChange={setInitialAmount} placeholder="10.000,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Período (anos)</Label>
              <Input
                id="period"
                type="number"
                min={1}
                placeholder="10"
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
              />
              <p className="text-xs text-muted-foreground/90">Tempo de aplicação em anos</p>
            </div>
            <div className="space-y-3">
              <Label>Cenários de Rentabilidade (% ao ano)</Label>
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
                    className="w-20"
                    placeholder="%"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">%</span>
                </div>
              ))}
            </div>
            <Button onClick={calculate} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              Simular
            </Button>
          </div>
        </div>

        <div className={cn("rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow min-h-[320px] flex flex-col min-w-0")}>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Comparação de Cenários</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Valor final e lucro por perfil</p>
            </div>
          </div>
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
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
              <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">Nenhum resultado ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Preencha os parâmetros e clique em &quot;Simular&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitabilitySimulator;

