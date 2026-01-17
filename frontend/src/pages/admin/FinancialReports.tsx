import { useState } from "react";
import { DollarSign, TrendingUp, Users, CreditCard, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const FinancialReports = () => {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const revenueData = [
    { month: "Jan", revenue: 82000, subscriptions: 1240 },
    { month: "Fev", revenue: 84000, subscriptions: 1245 },
    { month: "Mar", revenue: 85000, subscriptions: 1247 },
    { month: "Abr", revenue: 86000, subscriptions: 1250 },
    { month: "Mai", revenue: 87000, subscriptions: 1252 },
    { month: "Jun", revenue: 87500, subscriptions: 1247 },
  ];

  const commissionsData = [
    { consultant: "Consultor A", clients: 24, commission: 12500, percentage: 15 },
    { consultant: "Consultor B", clients: 18, commission: 9200, percentage: 12 },
    { consultant: "Consultor C", clients: 15, commission: 7500, percentage: 10 },
  ];

  const transactionData = [
    { date: "01/02", type: "Assinatura", amount: 299.90, client: "João Silva" },
    { date: "01/02", type: "Assinatura", amount: 499.90, client: "Maria Santos" },
    { date: "02/02", type: "Comissão", amount: -1500.00, client: "Consultor A" },
    { date: "03/02", type: "Assinatura", amount: 99.90, client: "Pedro Costa" },
  ];

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCommissions = commissionsData.reduce((sum, item) => sum + item.commission, 0);
  const netRevenue = totalRevenue - totalCommissions;
  const mrr = 87500;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe receitas, comissões e transações financeiras
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="quarter">Trimestral</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Receita Total"
          value={`R$ ${totalRevenue.toLocaleString("pt-BR")}`}
          change="+8,2%"
          changeType="positive"
          icon={DollarSign}
          subtitle="últimos 6 meses"
        />
        <ProfessionalKpiCard
          title="MRR"
          value={`R$ ${mrr.toLocaleString("pt-BR")}`}
          change="+2,1%"
          changeType="positive"
          icon={TrendingUp}
          subtitle="mensal recorrente"
        />
        <ProfessionalKpiCard
          title="Comissões"
          value={`R$ ${totalCommissions.toLocaleString("pt-BR")}`}
          change=""
          changeType="neutral"
          icon={CreditCard}
          subtitle="pagos a consultores"
        />
        <ProfessionalKpiCard
          title="Receita Líquida"
          value={`R$ ${netRevenue.toLocaleString("pt-BR")}`}
          change=""
          changeType="positive"
          icon={DollarSign}
          subtitle="receita - comissões"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Evolução de Receitas" subtitle="Receita vs Assinaturas">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                name="Receita (R$)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="subscriptions"
                stroke="#10b981"
                name="Assinaturas"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Comissões por Consultor" subtitle="Distribuição de comissões">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={commissionsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="consultant" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`} />
              <Legend />
              <Bar dataKey="commission" fill="#8b5cf6" name="Comissão (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Transaction Statement */}
      <ChartCard title="Extrato de Transações">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Últimas Transações</span>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Filtrar Período
            </Button>
          </div>
          {transactionData.map((transaction, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.amount > 0
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {transaction.amount > 0 ? (
                    <DollarSign className="h-5 w-5" />
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{transaction.type}</div>
                  <div className="text-xs text-muted-foreground">{transaction.client}</div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-semibold ${
                    transaction.amount > 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {transaction.amount > 0 ? "+" : ""}
                  R$ {Math.abs(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground">{transaction.date}</div>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};

export default FinancialReports;

