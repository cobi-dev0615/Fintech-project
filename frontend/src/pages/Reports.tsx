import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FileText, PieChart, TrendingUp, History, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CARD_ACCENTS = [
  { border: "border-blue-500/70", shadow: "hover:shadow-blue-500/5", icon: "text-blue-600 dark:text-blue-400" },
  { border: "border-emerald-500/70", shadow: "hover:shadow-emerald-500/5", icon: "text-emerald-600 dark:text-emerald-400" },
  { border: "border-violet-500/70", shadow: "hover:shadow-violet-500/5", icon: "text-violet-600 dark:text-violet-400" },
] as const;

const Reports = () => {
  const reportTypes = [
    { id: "customer-portfolio", value: "portfolio_analysis", label: "Customer Portfolio", icon: PieChart, description: "Todos os ativos obtidos via open finance" },
    { id: "investment-report", value: "portfolio_analysis", label: "Investment Report", icon: TrendingUp, description: "Análise de investimentos e composição da carteira" },
    { id: "transaction-report", value: "transactions", label: "Transaction Report", icon: FileText, description: "Histórico de transações por período" },
  ];
  const [selectedId, setSelectedId] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const reportType = reportTypes.find((t) => t.id === selectedId)?.value ?? "";

  const handleGenerate = async () => {
    if (!reportType) {
      toast({
        title: "Erro",
        description: "Selecione um tipo de relatório",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      const result = await reportsApi.generate({ type: reportType, dateRange: dateRange || undefined });
      toast({
        title: "Sucesso",
        description: (
          <>
            {result.message}{" "}
            <a href="/app/reports/history" className="underline font-medium">
              Ver no histórico
            </a>
          </>
        ),
        variant: "success",
      });
      setReportType("");
      setDateRange("");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao gerar relatório",
        variant: "destructive",
      });
      console.error("Error generating report:", err);
    } finally {
      setGenerating(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere e baixe relatórios financeiros detalhados
          </p>
        </div>
        <Link to="/app/reports/history">
          <Button variant="outline" size="sm" className="shrink-0">
            <History className="h-4 w-4 mr-2" />
            Ver histórico
          </Button>
        </Link>
      </div>

      {/* Report Types Grid - click to select and scroll to form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
        {reportTypes.map((type, index) => {
          const accent = CARD_ACCENTS[index];
          const isSelected = selectedId === type.id;
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                setReportType(type.value);
                scrollToForm();
              }}
              className={cn(
                "rounded-xl border-2 bg-card p-4 min-w-0 shadow-sm transition-all text-left",
                "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                accent.border,
                accent.shadow,
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2.5 rounded-lg shrink-0", isSelected ? "bg-primary/15" : "bg-muted/60")}>
                  <Icon className={cn("h-5 w-5", accent.icon)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {type.label}
                    </h3>
                    {isSelected && (
                      <span className="shrink-0 rounded-full bg-primary/20 p-0.5" aria-hidden>
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Generate form */}
      <ChartCard title="Gerar Novo Relatório" subtitle="Escolha o tipo acima e o período, depois gere o PDF">
        <div ref={formRef} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tipo de Relatório</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Período</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o período (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Mês Atual</SelectItem>
                  <SelectItem value="last-month">Mês Anterior</SelectItem>
                  <SelectItem value="last-3-months">Últimos 3 Meses</SelectItem>
                  <SelectItem value="last-6-months">Últimos 6 Meses</SelectItem>
                  <SelectItem value="last-year">Último Ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!reportType || generating}
            className="w-full sm:w-auto min-w-[200px]"
          >
            <FileText className={cn("h-4 w-4 mr-2", generating && "animate-pulse")} />
            {generating ? "Gerando PDF…" : "Gerar Relatório PDF"}
          </Button>
        </div>
      </ChartCard>
    </div>
  );
};

export default Reports;

;

;

;

 "Gerando PDF…" : "Gerar Relatório PDF"}
          </Button>
        </div>
      </ChartCard>
    </div>
  );
};

export default Reports;

;

;

