import { useState, useEffect } from "react";
import { CreditCard, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import AlertList, { Alert } from "@/components/dashboard/AlertList";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { cardsApi } from "@/lib/api";

const Cards = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
};

export default Cards;
