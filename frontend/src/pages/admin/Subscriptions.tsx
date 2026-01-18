import { useState, useEffect } from "react";
import { Search, TrendingUp, AlertCircle, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Subscription {
  id: string;
  user: string;
  email: string;
  plan: string;
  status: "active" | "canceled" | "past_due" | "trial";
  amount: number;
  nextBilling: string;
  createdAt: string;
}

const Subscriptions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getSubscriptions({
          search: searchQuery || undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
          plan: filterPlan !== "all" ? filterPlan : undefined,
        });
        setSubscriptions(response.subscriptions.map(sub => ({
          ...sub,
          status: sub.status as any,
          nextBilling: sub.nextBilling || "-",
        })));
      } catch (error: any) {
        console.error('Failed to fetch subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchSubscriptions();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filterStatus, filterPlan]);

  const filteredSubscriptions = subscriptions;

  const totalMRR = subscriptions
    .filter((sub) => sub.status === "active")
    .reduce((sum, sub) => sum + sub.amount, 0);

  const activeSubscriptions = subscriptions.filter((sub) => sub.status === "active").length;
  const pastDueSubscriptions = subscriptions.filter((sub) => sub.status === "past_due").length;

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-success/10 text-success",
      canceled: "bg-muted text-muted-foreground",
      past_due: "bg-destructive/10 text-destructive",
      trial: "bg-warning/10 text-warning",
    };
    const labels = {
      active: "Ativo",
      canceled: "Cancelado",
      past_due: "Atrasado",
      trial: "Período de Teste",
    };
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinaturas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie planos e pagamentos
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ProfessionalKpiCard
          title="Receita Recorrente (MRR)"
          value={`R$ ${totalMRR.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle="mensal"
        />
        <ProfessionalKpiCard
          title="Assinaturas Ativas"
          value={activeSubscriptions.toString()}
          change=""
          changeType="neutral"
          icon={CreditCard}
          subtitle="assinantes"
        />
        <ProfessionalKpiCard
          title="Pagamentos Atrasados"
          value={pastDueSubscriptions.toString()}
          change="requerem atenção"
          changeType="warning"
          icon={AlertCircle}
          subtitle=""
        />
      </div>

      {/* Filters */}
      <ChartCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar assinaturas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="past_due">Atrasado</SelectItem>
              <SelectItem value="canceled">Cancelado</SelectItem>
              <SelectItem value="trial">Período de Teste</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger>
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Basic">Basic</SelectItem>
              <SelectItem value="Pro">Pro</SelectItem>
              <SelectItem value="Consultant">Consultant</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ChartCard>

      {/* Subscriptions Table */}
      <ChartCard title={`${filteredSubscriptions.length} Assinatura${filteredSubscriptions.length !== 1 ? "s" : ""}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando assinaturas...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Assinante
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Plano
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Valor Mensal
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Próxima Cobrança
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{sub.user}</p>
                      <p className="text-xs text-muted-foreground">{sub.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-foreground">{sub.plan}</span>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(sub.status)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      R$ {sub.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">
                      {sub.nextBilling === "-" ? "-" : new Date(sub.nextBilling).toLocaleDateString("pt-BR")}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="outline" size="sm">
                      Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </ChartCard>
    </div>
  );
};

export default Subscriptions;

