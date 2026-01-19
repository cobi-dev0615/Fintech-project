import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, MessageSquare, Calendar, Plus, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Textarea } from "@/components/ui/textarea";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ClientProfile = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchClient = async () => {
      try {
        setLoading(true);
        const data = await consultantApi.getClient(id);
        setClientData(data);
        setError(null);
      } catch (err: any) {
        setError(err?.error || "Erro ao carregar dados do cliente");
        console.error("Error fetching client:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;

    try {
      const result = await consultantApi.addClientNote(id, newNote);
      setClientData((prev: any) => ({
        ...prev,
        notes: [result.note, ...(prev?.notes || [])],
      }));
      setNewNote("");
    } catch (err: any) {
      console.error("Error adding note:", err);
      toast({
        title: "Erro",
        description: err?.error || "Erro ao adicionar anotação",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error || !clientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error || "Cliente não encontrado"}</p>
      </div>
    );
  }

  const { client, financial, notes, reports } = clientData;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/consultant/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {client.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Gerar Relatório
          </Button>
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Mensagem
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Patrimônio Líquido"
          value={`R$ ${financial.netWorth.toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Caixa"
          value={`R$ ${financial.cash.toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={Wallet}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Investimentos"
          value={`R$ ${financial.investments.toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Dívidas"
          value={`R$ ${financial.debt.toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={Wallet}
          subtitle=""
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="investments">Investimentos</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="notes">Anotações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ChartCard title="Resumo Financeiro">
            <p className="text-sm text-muted-foreground">
              Visão consolidada das finanças do cliente. Os dados são atualizados automaticamente 
              através das conexões com instituições financeiras.
            </p>
          </ChartCard>
        </TabsContent>

        <TabsContent value="investments" className="space-y-4">
          <ChartCard title="Portfólio de Investimentos">
            <p className="text-sm text-muted-foreground">
              Detalhamento completo dos investimentos do cliente, incluindo ações, FIIs, 
              fundos e renda fixa.
            </p>
          </ChartCard>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ChartCard title="Relatórios Gerados">
            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum relatório gerado ainda
                </p>
              ) : (
                reports.map((report: any) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {report.type} - {report.generatedAt}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gerado em {report.generatedAt}
                      </p>
                    </div>
                    {report.downloadUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={report.downloadUrl} download>
                          Baixar
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Processando...
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <ChartCard 
            title="Anotações" 
            actions={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Anotação
              </Button>
            }
          >
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{note.date}</span>
                  </div>
                  <p className="text-sm text-foreground">{note.content}</p>
                </div>
              ))}
              <div className="p-4 rounded-lg border-2 border-dashed border-border">
                <Textarea
                  placeholder="Adicione uma nova anotação sobre este cliente..."
                  className="min-h-[100px] resize-none"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <Button className="mt-3" size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                  Salvar Anotação
                </Button>
              </div>
            </div>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientProfile;

