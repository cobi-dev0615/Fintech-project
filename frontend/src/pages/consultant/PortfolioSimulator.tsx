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
import { useTranslation } from "react-i18next";

const PortfolioSimulator = () => {
  const { t } = useTranslation(['consultant', 'common']);
  const [selectedClient, setSelectedClient] = useState("");
  const [scenario, setScenario] = useState<"conservative" | "moderate" | "bold">("moderate");
  const [timeHorizon, setTimeHorizon] = useState("10");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const clients = ["João Silva", "Maria Santos", "Pedro Costa"];

  // Helper function for scenario labels
  const getScenarioLabel = (scenario: string) => {
    return t(`consultant:simulator.scenarios.${scenario}`, { defaultValue: scenario });
  };

  // Helper function for allocation labels
  const getAllocationLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      "Renda Fixa": "fixedIncome",
      "Ações": "stocks",
      "FIIs": "reits"
    };
    const key = typeMap[type];
    return key ? t(`consultant:simulator.allocation.${key}`, { defaultValue: type }) : type;
  };

  const scenarioConfig = {
    conservative: {
      allocation: [
        { name: "Renda Fixa", value: 70, color: "#10b981" },
        { name: "Ações", value: 20, color: "#3b82f6" },
        { name: "FIIs", value: 10, color: "#8b5cf6" },
      ],
      expectedReturn: 7,
    },
    moderate: {
      allocation: [
        { name: "Renda Fixa", value: 50, color: "#10b981" },
        { name: "Ações", value: 30, color: "#3b82f6" },
        { name: "FIIs", value: 20, color: "#8b5cf6" },
      ],
      expectedReturn: 10,
    },
    bold: {
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
        title: t('common:error'),
        description: t('consultant:simulator.toast.selectClient'),
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
      scenario: getScenarioLabel(scenario),
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('consultant:simulator.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            {t('consultant:simulator.subtitle')}
          </p>
        </div>
        {results && (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('consultant:simulator.exportButton')}
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
                <h2 className="text-sm font-semibold text-foreground">{t('consultant:simulator.config.title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t('consultant:simulator.config.subtitle')}</p>
              </div>
            </div>
          <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="client">{t('consultant:simulator.config.client')}</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder={t('consultant:simulator.config.clientPlaceholder')} />
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
                <Label htmlFor="scenario">{t('consultant:simulator.config.scenario')}</Label>
                <Select
                  value={scenario}
                  onValueChange={(v: any) => setScenario(v)}
                >
                  <SelectTrigger id="scenario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">{t('consultant:simulator.scenarios.conservative')}</SelectItem>
                  <SelectItem value="moderate">{t('consultant:simulator.scenarios.moderate')}</SelectItem>
                  <SelectItem value="bold">{t('consultant:simulator.scenarios.bold')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

              <div className="space-y-2">
                <Label htmlFor="horizon">{t('consultant:simulator.config.horizon')}</Label>
                <Input
                  id="horizon"
                  type="number"
                  placeholder={t('consultant:simulator.config.horizonPlaceholder')}
                  value={timeHorizon}
                  onChange={(e) => setTimeHorizon(e.target.value)}
                />
              </div>

              <Button onClick={simulate} className="w-full" disabled={!selectedClient}>
              <TrendingUp className="h-4 w-4 mr-2" />
              {t('consultant:simulator.config.simulateButton')}
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
                  <h3 className="text-sm font-semibold text-foreground">{t('consultant:simulator.allocation.title')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('consultant:simulator.allocation.subtitle')}</p>
                </div>
              </div>
              <div className="space-y-3">
                {results.allocation.map((item: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{getAllocationLabel(item.name)}</span>
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
                    <h2 className="text-sm font-semibold text-foreground">{t('consultant:simulator.results.title')}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('consultant:simulator.results.subtitle')}</p>
                  </div>
                </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">{t('consultant:simulator.results.finalValue')}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary break-words">
                      R$ {results.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">{t('consultant:simulator.results.totalReturn')}</div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-success break-words">
                      +{results.totalReturn.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">{t('consultant:simulator.results.currentValue')}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold break-words">
                      R$ {results.currentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-semibold mb-4">{t('consultant:simulator.results.growthProjection')}</h3>
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
                        name={t('consultant:simulator.results.portfolioValue')}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              </div>

              <div className={cn("rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow")}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{t('consultant:simulator.analysis.title')}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('consultant:simulator.analysis.subtitle')}</p>
                  </div>
                </div>
              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 break-words">
                  {t('consultant:simulator.analysis.comparison', { client: results.client })}
                </p>
                <div className="space-y-3">
                  {Object.entries(scenarioConfig).map(([key, config]) => (
                    <div key={key} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm sm:text-base font-semibold truncate">{getScenarioLabel(key)}</div>
                          <div className="text-xs text-muted-foreground">
                            {t('consultant:simulator.analysis.expectedReturn', { return: config.expectedReturn })}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold">
                            {key === scenario ? (
                              <Badge className="bg-primary text-xs">{t('consultant:simulator.analysis.current')}</Badge>
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
                                {t('consultant:simulator.analysis.simulateButton')}
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
                  <h2 className="text-sm font-semibold text-foreground">{t('consultant:simulator.title')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('consultant:simulator.subtitle')}</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
                <PieChart className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">{t('consultant:simulator.empty.title')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('consultant:simulator.empty.description')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioSimulator;
