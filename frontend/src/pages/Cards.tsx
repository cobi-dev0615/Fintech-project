import { useState } from "react";
import { CreditCard, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import AlertList, { Alert } from "@/components/dashboard/AlertList";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const Cards = () => {
  const [selectedCard, setSelectedCard] = useState("nubank");

  const spendingData = [
    { name: "Alimentação", value: 850, color: "#3b82f6" },
    { name: "Transporte", value: 420, color: "#06b6d4" },
    { name: "Compras", value: 1200, color: "#8b5cf6" },
    { name: "Utilidades", value: 380, color: "#10b981" },
    { name: "Outros", value: 432, color: "#6b7280" },
  ];

  const alerts: Alert[] = [
    {
      id: "1",
      type: "warning",
      title: "Fatura vence em breve",
      message: "Fatura Nubank de R$ 2.882 vence em 3 dias",
      timestamp: "15 de Janeiro",
    },
    {
      id: "2",
      type: "info",
      title: "Limite disponível",
      message: "R$ 7.118 disponíveis do limite de R$ 10.000",
    },
    {
      id: "3",
      type: "warning",
      title: "Gastos acima da média",
      message: "Gastos deste mês 15% maiores que a média dos últimos 3 meses",
    },
  ];

  const totalSpending = spendingData.reduce((sum, item) => sum + item.value, 0);
  const limit = 10000;
  const usage = (totalSpending / limit) * 100;

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
        <Select value={selectedCard} onValueChange={setSelectedCard}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Selecione um cartão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nubank">Nubank •••• 1234</SelectItem>
            <SelectItem value="itau">Itaú •••• 5678</SelectItem>
            <SelectItem value="inter">Inter •••• 9012</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Fatura Atual"
          value="R$ 2.882"
          change=""
          changeType="neutral"
          icon={CreditCard}
          subtitle="Fechamento: 25/01"
        />
        <ProfessionalKpiCard
          title="Vencimento"
          value="28/01"
          change="Em 3 dias"
          changeType="warning"
          icon={Calendar}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Limite Total"
          value="R$ 10.000"
          change={`${usage.toFixed(1)}% usado`}
          changeType={usage > 80 ? "negative" : "neutral"}
          icon={TrendingUp}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Disponível"
          value="R$ 7.118"
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
    </div>
  );
};

export default Cards;
