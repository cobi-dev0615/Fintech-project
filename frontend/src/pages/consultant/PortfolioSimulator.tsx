import { useState } from "react";
import { TrendingUp, PieChart, BarChart3, Settings, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
      alert("Selecione um cliente primeiro");
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Simulador de Portfólio</h1>
          <p className="text-sm text-muted-foreground mt-1">
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
        <div className="lg:col-span-1 space-y-6">
          <ChartCard title="Configuração">
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
          </ChartCard>

          {results && (
            <ChartCard title="Alocação">
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
            </ChartCard>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {results ? (
            <>
              <ChartCard title="Resultados da Simulação">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-sm text-muted-foreground mb-1">Valor Final</div>
                    <div className="text-2xl font-bold text-primary">
                      R$ {results.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="text-sm text-muted-foreground mb-1">Retorno Total</div>
                    <div className="text-2xl font-bold text-success">
                      +{results.totalReturn.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Valor Atual</div>
                    <div className="text-2xl font-bold">
                      R$ {results.currentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-4">Projeção de Crescimento</h3>
                  <ResponsiveContainer width="100%" height={300}>
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
              </ChartCard>

              <ChartCard title="Análise de Cenários">
                <p className="text-sm text-muted-foreground mb-4">
                  Comparação dos diferentes perfis de investimento para o cliente {results.client}
                </p>
                <div className="space-y-3">
                  {Object.entries(scenarioConfig).map(([key, config]) => (
                    <div key={key} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{config.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Retorno esperado: {config.expectedReturn}% a.a.
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {key === scenario ? (
                              <Badge className="bg-primary">Atual</Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
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
              </ChartCard>
            </>
          ) : (
            <ChartCard title="Simulação">
              <div className="text-center py-12 text-muted-foreground">
                <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configure os parâmetros e clique em "Simular" para ver os resultados</p>
              </div>
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioSimulator;
