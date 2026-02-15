import { useState, useMemo } from "react";
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Settings,
  Download,
  LineChart as LineChartIcon,
  Clock,
  Layers,
  GripVertical,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { useCurrency } from "@/contexts/CurrencyContext";
import ChartCard from "@/components/dashboard/ChartCard";
import { useAuth } from "@/hooks/useAuth";

// --- Types ---

interface SimKpiDef {
  title: string;
  value: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableSimKpiCard({ id, kpi }: { id: string; kpi: SimKpiDef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "z-50 opacity-50 scale-105" : ""}`}
    >
      <button
        type="button"
        className="drag-handle absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/80 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none rounded-md p-1 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="kpi-card relative overflow-hidden h-full">
        <kpi.watermark className="absolute -bottom-3 -right-3 h-24 w-24 text-muted-foreground/[0.06] pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-3 relative z-10">
          <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground truncate">
            {kpi.title}
          </span>
        </div>

        <div className="relative z-10">
          <div className="text-2xl sm:text-[28px] font-bold text-foreground mb-1 tabular-nums tracking-tight leading-none">
            {kpi.value}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Constants ---

const SIM_KPI_IDS = ["sim-scenarios", "sim-return", "sim-horizon", "sim-allocation"] as const;

const scenarioConfig = {
  conservative: {
    allocation: [
      { name: "fixedIncome", value: 70, color: "#10b981" },
      { name: "stocks", value: 20, color: "#3b82f6" },
      { name: "reits", value: 10, color: "#8b5cf6" },
    ],
    expectedReturn: 7,
  },
  moderate: {
    allocation: [
      { name: "fixedIncome", value: 50, color: "#10b981" },
      { name: "stocks", value: 30, color: "#3b82f6" },
      { name: "reits", value: 20, color: "#8b5cf6" },
    ],
    expectedReturn: 10,
  },
  bold: {
    allocation: [
      { name: "fixedIncome", value: 30, color: "#10b981" },
      { name: "stocks", value: 50, color: "#3b82f6" },
      { name: "reits", value: 20, color: "#8b5cf6" },
    ],
    expectedReturn: 13,
  },
};

// --- Component ---

const PortfolioSimulator = () => {
  const { t } = useTranslation(['consultant', 'common']);
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState("");
  const [scenario, setScenario] = useState<"conservative" | "moderate" | "bold">("moderate");
  const [timeHorizon, setTimeHorizon] = useState("10");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const clients = ["João Silva", "Maria Santos", "Pedro Costa"];

  // Helper functions
  const getScenarioLabel = (scenario: string) => {
    return t(`consultant:simulator.scenarios.${scenario}`, { defaultValue: scenario });
  };

  const getAllocationLabel = (key: string) => {
    return t(`consultant:simulator.allocation.${key}`, { defaultValue: key });
  };

  // --- KPI DnD ---

  const kpiStorageKey = `simulator-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === SIM_KPI_IDS.length &&
          SIM_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...SIM_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleKpiDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setKpiOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, moved);
      localStorage.setItem(kpiStorageKey, JSON.stringify(next));
      return next;
    });
  };

  // --- KPI Computation ---

  const kpiData = useMemo(() => {
    const config = scenarioConfig[scenario];
    return {
      "sim-scenarios": {
        title: t('consultant:simulator.kpis.scenarios'),
        value: "3",
        changeType: "neutral" as const,
        icon: Layers,
        watermark: Layers,
      },
      "sim-return": {
        title: t('consultant:simulator.kpis.expectedReturn'),
        value: `${config.expectedReturn}%`,
        changeType: "positive" as const,
        icon: TrendingUp,
        watermark: TrendingUp,
      },
      "sim-horizon": {
        title: t('consultant:simulator.kpis.horizon'),
        value: timeHorizon || "10",
        changeType: "neutral" as const,
        icon: Clock,
        watermark: Clock,
      },
      "sim-allocation": {
        title: t('consultant:simulator.kpis.allocation'),
        value: String(config.allocation.length),
        changeType: "neutral" as const,
        icon: PieChart,
        watermark: PieChart,
      },
    };
  }, [scenario, timeHorizon, t]);

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
    const currentValue = 500000;
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
      {/* KPI Cards */}
      <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiOrder.map((id) => (
              <SortableSimKpiCard key={id} id={id} kpi={kpiData[id as keyof typeof kpiData]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-1 space-y-6 min-w-0">
          <ChartCard
            title={t('consultant:simulator.config.title')}
            subtitle={t('consultant:simulator.config.subtitle')}
          >
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
          </ChartCard>

          {results && (
            <ChartCard
              title={t('consultant:simulator.allocation.title')}
              subtitle={t('consultant:simulator.allocation.subtitle')}
            >
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
            </ChartCard>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {results ? (
            <>
              <ChartCard
                title={t('consultant:simulator.results.title')}
                subtitle={t('consultant:simulator.results.subtitle')}
                actions={
                  <Button variant="outline" size="sm">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {t('consultant:simulator.exportButton')}
                  </Button>
                }
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-xs sm:text-sm text-muted-foreground mb-1">{t('consultant:simulator.results.finalValue')}</div>
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary break-words">
                        {formatCurrency(results.finalValue)}
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
                        {formatCurrency(results.currentValue)}
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
                          formatter={(value: number) => formatCurrency(value)}
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
              </ChartCard>

              <ChartCard
                title={t('consultant:simulator.analysis.title')}
                subtitle={t('consultant:simulator.analysis.subtitle')}
              >
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
              </ChartCard>
            </>
          ) : (
            <ChartCard
              title={t('consultant:simulator.title')}
              subtitle={t('consultant:simulator.subtitle')}
            >
              <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
                <PieChart className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">{t('consultant:simulator.empty.title')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('consultant:simulator.empty.description')}</p>
              </div>
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioSimulator;
