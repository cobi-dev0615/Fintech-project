import { useState } from "react";
import { FileText, Download, Plus, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Report {
  id: string;
  clientName: string;
  type: string;
  generatedAt: string;
  status: "generated" | "pending";
  hasWatermark: boolean;
  downloadUrl?: string;
}

const ProfessionalReports = () => {
  const [selectedClient, setSelectedClient] = useState("");
  const [reportType, setReportType] = useState("");
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [customBranding, setCustomBranding] = useState(false);

  const reports: Report[] = [
    {
      id: "1",
      clientName: "João Silva",
      type: "Relatório Consolidado",
      generatedAt: "15/02/2024",
      status: "generated",
      hasWatermark: true,
    },
    {
      id: "2",
      clientName: "Maria Santos",
      type: "Análise de Portfólio",
      generatedAt: "10/02/2024",
      status: "generated",
      hasWatermark: true,
    },
    {
      id: "3",
      clientName: "Pedro Costa",
      type: "Planejamento Financeiro",
      generatedAt: "01/02/2024",
      status: "generated",
      hasWatermark: false,
    },
  ];

  const clients = ["João Silva", "Maria Santos", "Pedro Costa", "Ana Oliveira"];
  const reportTypes = [
    "Relatório Consolidado",
    "Análise de Portfólio",
    "Planejamento Financeiro",
    "Relatório Mensal",
    "Relatório Personalizado",
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios Profissionais</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e gerencie relatórios personalizados para seus clientes
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Relatório
        </Button>
      </div>

      {/* Report Generator */}
      <ChartCard title="Gerar Novo Relatório">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="type">Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="watermark"
                checked={includeWatermark}
                onCheckedChange={(checked) => setIncludeWatermark(checked as boolean)}
              />
              <Label htmlFor="watermark" className="cursor-pointer">
                Incluir marca d'água do consultor
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="branding"
                checked={customBranding}
                onCheckedChange={(checked) => setCustomBranding(checked as boolean)}
              />
              <Label htmlFor="branding" className="cursor-pointer">
                Incluir logotipo e identidade visual personalizada
              </Label>
            </div>
          </div>

          <Button className="w-full md:w-auto" disabled={!selectedClient || !reportType}>
            <FileText className="h-4 w-4 mr-2" />
            Gerar Relatório PDF
          </Button>
        </div>
      </ChartCard>

      {/* Reports History */}
      <ChartCard title="Relatórios Gerados">
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum relatório gerado ainda</p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{report.type}</h3>
                      <Badge variant={report.status === "generated" ? "default" : "secondary"}>
                        {report.status === "generated" ? "Gerado" : "Pendente"}
                      </Badge>
                      {report.hasWatermark && (
                        <Badge variant="outline" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          Marca d'água
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Cliente: {report.clientName}</span>
                      <span>•</span>
                      <span>Gerado em: {report.generatedAt}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
              </div>
            ))
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default ProfessionalReports;

