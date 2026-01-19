import { useState, useEffect } from "react";
import { CreditCard, Calendar, AlertTriangle, TrendingUp, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import AlertList, { Alert } from "@/components/dashboard/AlertList";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { cardsApi, connectionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Cards = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    displayName: '',
    brand: '',
    last4: '',
    limitCents: '',
    institutionId: '',
    connectionId: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const data = await cardsApi.getAll();
        setCards(data.cards);
        if (data.cards.length > 0) {
          setSelectedCard(data.cards[0].id);
        }
        setError(null);
      } catch (err: any) {
        setError(err?.error || "Erro ao carregar cartões");
        console.error("Error fetching cards:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  // Fetch institutions and connections when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      const fetchData = async () => {
        try {
          const [instData, connData] = await Promise.all([
            connectionsApi.getInstitutions(),
            connectionsApi.getAll(),
          ]);
          setInstitutions(instData.institutions || []);
          setConnections(connData.connections || []);
        } catch (err: any) {
          console.error('Error fetching institutions/connections:', err);
        }
      };
      fetchData();
    }
  }, [isDialogOpen]);

  useEffect(() => {
    if (!selectedCard) return;

    const fetchInvoices = async () => {
      try {
        const data = await cardsApi.getInvoices(selectedCard);
        setInvoices(data.invoices || []);
      } catch (err: any) {
        console.error("Error fetching invoices:", err);
      }
    };

    fetchInvoices();
  }, [selectedCard]);

  const currentCard = cards.find((c) => c.id === selectedCard);
  const currentInvoice = invoices.length > 0 ? invoices[0] : null;
  
  const spendingData: any[] = []; // TODO: Get spending by category from invoice items
  const totalSpending = currentInvoice ? parseFloat(currentInvoice.total_cents || 0) / 100 : 0;
  const limit = currentCard ? parseFloat(currentCard.limit_cents || 0) / 100 : 0;
  const available = limit - totalSpending;
  const usage = limit > 0 ? (totalSpending / limit) * 100 : 0;

  const alerts: Alert[] = [];
  if (currentInvoice) {
    const dueDate = currentInvoice.due_date ? new Date(currentInvoice.due_date) : null;
    if (dueDate) {
      const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 7 && daysUntilDue > 0) {
        alerts.push({
          id: "due-soon",
      type: "warning",
      title: "Fatura vence em breve",
          message: `Fatura de R$ ${totalSpending.toLocaleString("pt-BR")} vence em ${daysUntilDue} dia(s)`,
          timestamp: dueDate.toLocaleDateString("pt-BR"),
        });
      }
    }
  }
  if (limit > 0) {
    alerts.push({
      id: "limit",
      type: "info",
      title: "Limite disponível",
      message: `R$ ${available.toLocaleString("pt-BR")} disponíveis do limite de R$ ${limit.toLocaleString("pt-BR")}`,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const dueDate = currentInvoice?.due_date ? new Date(currentInvoice.due_date).toLocaleDateString("pt-BR") : "N/A";
  const periodEnd = currentInvoice?.period_end ? new Date(currentInvoice.period_end).toLocaleDateString("pt-BR") : "N/A";

  const handleCreateCard = async () => {
    if (!formData.displayName || !formData.brand || !formData.last4) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validate last4 is 4 digits
    if (!/^\d{4}$/.test(formData.last4)) {
      toast({
        title: "Erro",
        description: "Os últimos 4 dígitos devem ser exatamente 4 números",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      await cardsApi.create({
        displayName: formData.displayName,
        brand: formData.brand,
        last4: formData.last4,
        limitCents: formData.limitCents ? Math.round(parseFloat(formData.limitCents) * 100) : undefined,
        institutionId: formData.institutionId || undefined,
        connectionId: formData.connectionId || undefined,
      });

      toast({
        title: "Sucesso",
        description: "Cartão cadastrado com sucesso",
      });

      // Refresh cards list
      const data = await cardsApi.getAll();
      setCards(data.cards);
      if (data.cards.length > 0 && !selectedCard) {
        setSelectedCard(data.cards[0].id);
      }

      // Reset form and close dialog
      setFormData({
        displayName: '',
        brand: '',
        last4: '',
        limitCents: '',
        institutionId: '',
        connectionId: '',
      });
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error('Error creating card:', err);
      toast({
        title: "Erro",
        description: err?.error || "Erro ao cadastrar cartão",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setFormData({
        displayName: '',
        brand: '',
        last4: '',
        limitCents: '',
        institutionId: '',
        connectionId: '',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cartões de Crédito</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie faturas e acompanhe gastos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="w-full md:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Cartão
          </Button>
          {cards.length > 0 && (
            <Select value={selectedCard} onValueChange={setSelectedCard}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Selecione um cartão" />
              </SelectTrigger>
              <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.display_name || card.institution_name} •••• {card.last4 || ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum cartão cadastrado</p>
        </div>
      ) : (
        <>
      {/* Invoice Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Fatura Atual"
              value={`R$ ${totalSpending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change=""
          changeType="neutral"
          icon={CreditCard}
              subtitle={`Fechamento: ${periodEnd}`}
        />
        <ProfessionalKpiCard
          title="Vencimento"
              value={currentInvoice?.due_date ? new Date(currentInvoice.due_date).toLocaleDateString("pt-BR") : "N/A"}
              change={currentInvoice?.due_date ? "" : ""}
              changeType="neutral"
          icon={Calendar}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Limite Total"
              value={`R$ ${limit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change={`${usage.toFixed(1)}% usado`}
          changeType={usage > 80 ? "negative" : "neutral"}
          icon={TrendingUp}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Disponível"
              value={`R$ ${available.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change=""
          changeType="neutral"
          icon={CreditCard}
          subtitle=""
        />
      </div>

      {/* Charts and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard
            title="Gastos por Categoria"
            subtitle="Período atual"
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {spendingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      `R$ ${value.toLocaleString("pt-BR")}`
                    }
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {spendingData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-foreground font-medium tabular-nums">
                    R$ {item.value.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
        <div>
          <AlertList alerts={alerts} />
        </div>
      </div>

      {/* Limit Usage Indicator */}
      <ChartCard title="Uso do Limite">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Utilizado</span>
            <span className="text-foreground font-semibold tabular-nums">
              R$ {totalSpending.toLocaleString("pt-BR")} / R$ {limit.toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usage > 80
                  ? "bg-destructive"
                  : usage > 60
                  ? "bg-warning"
                  : "bg-success"
              }`}
              style={{ width: `${Math.min(usage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </ChartCard>
        </>
      )}

      {/* Create Card Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cartão</DialogTitle>
            <DialogDescription>
              Preencha as informações do cartão de crédito
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome do Cartão *</Label>
              <Input
                id="displayName"
                placeholder="Ex: Cartão Principal"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Bandeira *</Label>
              <Select
                value={formData.brand}
                onValueChange={(value) => setFormData({ ...formData, brand: value })}
              >
                <SelectTrigger id="brand">
                  <SelectValue placeholder="Selecione a bandeira" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="amex">American Express</SelectItem>
                  <SelectItem value="elo">Elo</SelectItem>
                  <SelectItem value="hipercard">Hipercard</SelectItem>
                  <SelectItem value="other">Outra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="last4">Últimos 4 dígitos *</Label>
              <Input
                id="last4"
                placeholder="1234"
                maxLength={4}
                value={formData.last4}
                onChange={(e) => setFormData({ ...formData, last4: e.target.value.replace(/\D/g, '') })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limitCents">Limite (R$)</Label>
              <Input
                id="limitCents"
                type="number"
                step="0.01"
                placeholder="Ex: 5000.00"
                value={formData.limitCents}
                onChange={(e) => setFormData({ ...formData, limitCents: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institutionId">Instituição (opcional)</Label>
              <Select
                value={formData.institutionId || "none"}
                onValueChange={(value) => setFormData({ ...formData, institutionId: value === "none" ? "" : value })}
              >
                <SelectTrigger id="institutionId">
                  <SelectValue placeholder="Selecione uma instituição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="connectionId">Conexão (opcional)</Label>
              <Select
                value={formData.connectionId || "none"}
                onValueChange={(value) => setFormData({ ...formData, connectionId: value === "none" ? "" : value })}
              >
                <SelectTrigger id="connectionId">
                  <SelectValue placeholder="Selecione uma conexão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.institution_name || conn.provider} - {conn.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCard}
              disabled={creating || !formData.displayName || !formData.brand || !formData.last4}
            >
              {creating ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cards;
