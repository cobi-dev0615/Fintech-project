import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Calendar, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const [reportType, setReportType] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const reportTypes = [
    { value: "consolidated", label: "Relatório Consolidado", icon: BarChart3, description: "Visão geral completa do patrimônio" },
    { value: "transactions", label: "Extrato de Transações", icon: FileText, description: "Histórico de transações por período" },
    { value: "portfolio_analysis", label: "Evolução de Investimentos", icon: TrendingUp, description: "Performance e evolução patrimonial" },
    { value: "monthly", label: "Relatório Mensal", icon: Calendar, description: "Resumo mensal de receitas e despesas" },
  ];

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
            <Link to="/app/reports/history" className="underline font-medium">
              Ver no histórico
            </Link>
          </>
        ),
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere e baixe relatórios financeiros detalhados
          </p>
        </div>
      </div>

      {/* Report Type Selection */}
      <ChartCard title="Gerar Novo Relatório">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tipo de Relatório</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Período</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
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
            className="w-full md:w-auto"
          >
            <FileText className="h-4 w-4 mr-2" />
            {generating ? "Gerando..." : "Gerar Relatório PDF"}
          </Button>
        </div>
      </ChartCard>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((type) => (
          <div
            key={type.value}
            className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => setReportType(type.value)}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <type.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {type.label}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {type.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;

