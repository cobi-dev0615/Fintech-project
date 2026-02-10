import { useState } from "react";
import { TrendingUp, PieChart, BarChart3, Settings, Download, LineChart as LineChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

const PortfolioSimulator = () => {
  const [selectedClient, setSelectedClient] = useState("");
  const [scenario, setScenario] = useState<"conservative" | "moderate" | "bold">("moderate");
  const [timeHorizon, setTimeHorizon] = useState("10");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const clients = ["João Silva", "Maria Santos", "Pedro Costa"];

  const scenarioConfig = {
    conservative: {
      name: "Conservador",
      allocation: [
        { name: "Renda Fixa", value: 70, color: "#10b981" },
        { name: "Ações", value: 20, color: "#3b82f6" },
        { name: "FIIs", value: 10, color: "#8b5cf6" },
      ],
      expectedReturn: 7,
    },
    moderate: {
      name: "Moderado",
      allocation: [
        { name: "Renda Fixa", value: 50, color: "#10b981" },
        { name: "Ações", value: 30, color: "#3b82f6" },
        { name: "FIIs", value: 20, color: "#8b5cf6" },
      ],
      expectedReturn: 10,
    },
    bold: {
      name: "Arrojado",
      allocation: [
        { name: "Renda Fixa", value: 30, color: "#10b981" },
        { name: "Ações", value: 50, color: "#3b82f6" },
        { name: "FIIs", value: 20, color: "#8b5cf6" },
      ],
      expectedReturn: 13,
    },
  };

  const simulate = () => {
    if (!selectedClient) {
      toast({
        title: "Erro",
        description: "Selecione um cliente primeiro",
        variant: "destructive",
      });
      return;
    }

    const config = scenarioConfig[scenario];
    const years = parseFloat(timeHorizon) || 10;
    const currentValue = 500000; // Example current portfolio value
    const annualReturn = config.expectedReturn / 100;

    const projection: { year: number; value: number; profit: number }[] = [];
    let value = currentValue;

    for (let year = 0; year <= years; year++) {
      if (year > 0) {
        value = value * (1 + annualReturn);
      }
        projection.push({
          year,
        value,
        profit: value - currentValue,
        });
    }

    setResults({
      client: selectedClient,
      scenario: config.name,
      currentValue,
      finalValue: value,
      totalReturn: ((value - currentValue) / currentValue) * 100,
      allocation: config.allocation,
      projection,
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Simulador de Portfólio</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Crie projeções de portfólio para apresentar aos clientes
          </p>
        </div>
        {results && (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Simulação
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-1 space-y-6 min-w-0">
          <div className={cn("rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow")}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Configuração</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Cliente, cenário e horizonte</p>
              </div>
            </div>
          <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client} value={client}>
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="scenario">Cenário</Label>
                <Select
                  value={scenario}
                  onValueChange={(v: any) => setScenario(v)}
                >
                  <SelectTrigger id="scenario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservador</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="bold">Arrojado</SelectItem>
                </SelectContent>
              </Select>
            </div>

              <div className="space-y-2">
                <Label htmlFor="horizon">Horizonte (anos)</Label>
                <Input
                  id="horizon"
                  type="number"
                  placeholder="10"
                  value={timeHorizon}
                  onChange={(e) => setTimeHorizon(e.target.value)}
                />
              </div>

              <Button onClick={simulate} className="w-full" disabled={!selectedClient}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Simular
            </Button>
          </div>
        </div>

          {results && (
            <div className={cn("rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow")}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <PieChart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Alocação</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Perfil do cenário selecionado</p>
                </div>
              </div>
              <div className="space-y-3">
                {results.allocation.map((item: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{item.name}</span>
                      <span className="font-semibold">{item.value}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
                </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {results ? (
            <>
              <div className={cn("rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow")}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <LineChartIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Resultados da Simulação</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Projeção e crescimento do portfólio</p>
                  </div>
                </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Valor Final</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary break-words">
                      R$ {results.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Retorno Total</div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-success break-words">
                      +{results.totalReturn.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Valor Atual</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold break-words">
                      R$ {results.currentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-semibold mb-4">Projeção de Crescimento</h3>
                  <ResponsiveContainer width="100%" height={250} className="text-xs">
                    <LineChart data={results.projection}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Valor do Portfólio"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              </div>
              </div>

              <div className={cn("rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow")}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Análise de Cenários</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Compare perfis de investimento</p>
                  </div>
                </div>
              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 break-words">
                  Comparação dos diferentes perfis de investimento para o cliente {results.client}
                </p>
                <div className="space-y-3">
                  {Object.entries(scenarioConfig).map(([key, config]) => (
                    <div key={key} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm sm:text-base font-semibold truncate">{config.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Retorno esperado: {config.expectedReturn}% a.a.
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold">
                            {key === scenario ? (
                              <Badge className="bg-primary text-xs">Atual</Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  setScenario(key as any);
                                  setTimeout(simulate, 100);
                                }}
                              >
                                Simular
                              </Button>
              )}
            </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </>
          ) : (
            <div className={cn("rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow min-h-[200px] flex flex-col")}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <PieChart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Simulação</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Projeção de portfólio por cenário</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
                <PieChart className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">Nenhum resultado ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Selecione um cliente, configure o cenário e clique em &quot;Simular&quot;</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioSimulator;
