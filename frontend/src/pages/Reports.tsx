import { useState, useEffect } from "react";
import { FileText, Download, Calendar, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  type: string;
  date: string;
  status: "generated" | "pending";
  downloadUrl?: string | null;
}

const Reports = () => {
  const [reportType, setReportType] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const reportTypes = [
    { value: "consolidated", label: "Relatório Consolidado", icon: BarChart3, description: "Visão geral completa do patrimônio" },
    { value: "transactions", label: "Extrato de Transações", icon: FileText, description: "Histórico de transações por período" },
    { value: "portfolio_analysis", label: "Evolução de Investimentos", icon: TrendingUp, description: "Performance e evolução patrimonial" },
    { value: "monthly", label: "Relatório Mensal", icon: Calendar, description: "Resumo mensal de receitas e despesas" },
  ];

  const reportTypeLabels: Record<string, string> = {
    consolidated: "Relatório Consolidado",
    transactions: "Extrato de Transações",
    portfolio_analysis: "Evolução de Investimentos",
    monthly: "Relatório Mensal",
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const data = await reportsApi.getAll();
        setReports(data.reports.map(r => ({
          id: r.id,
          type: reportTypeLabels[r.type] || r.type,
          date: r.generatedAt,
          status: r.status === "generated" ? "generated" : "pending",
          downloadUrl: r.downloadUrl,
        })));
      } catch (err: any) {
        console.error("Error fetching reports:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

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
      setReports([{
        id: result.report.id,
        type: reportTypeLabels[reportType] || reportType,
        date: result.report.generatedAt,
        status: "pending",
      }, ...reports]);
      toast({
        title: "Sucesso",
        description: result.message,
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

      {/* Generated Reports History */}
      <ChartCard title="Relatórios Gerados">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Nenhum relatório gerado ainda
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {report.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Gerado em {report.date}
                    </p>
                  </div>
                </div>
                {report.downloadUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={report.downloadUrl} download>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Processando...
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default Reports;

