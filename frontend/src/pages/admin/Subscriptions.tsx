import { useState, useEffect } from "react";
import { Search, TrendingUp, AlertCircle, CreditCard, User, Calendar, Package, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

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

interface SubscriptionDetail {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  plan: {
    id: string;
    name: string;
    code: string;
    price: number;
    connectionLimit: number | null;
    features: string[];
  };
}

const Subscriptions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [subscriptionDetail, setSubscriptionDetail] = useState<SubscriptionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getSubscriptions({
          search: searchQuery || undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
          plan: filterPlan !== "all" ? filterPlan : undefined,
          page,
          limit: 20,
          startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
          endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        });
        setSubscriptions(response.subscriptions.map(sub => ({
          ...sub,
          status: sub.status as any,
          nextBilling: sub.nextBilling || "-",
        })));
        setPagination(response.pagination);
      } catch (error: any) {
        console.error('Failed to fetch subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      if (searchQuery || filterStatus !== "all" || filterPlan !== "all" || dateRange.from || dateRange.to) {
        setPage(1); // Reset to first page on filter change
      }
      fetchSubscriptions();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filterStatus, filterPlan, page, dateRange.from, dateRange.to]);

  const filteredSubscriptions = subscriptions;

  const totalMRR = subscriptions
    .filter((sub) => sub.status === "active")
    .reduce((sum, sub) => sum + sub.amount, 0);

  const activeSubscriptions = subscriptions.filter((sub) => sub.status === "active").length;
  const pastDueSubscriptions = subscriptions.filter((sub) => sub.status === "past_due").length;

  const fetchSubscriptionDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const detail = await adminApi.getSubscription(id);
      setSubscriptionDetail(detail);
    } catch (error: any) {
      console.error('Failed to fetch subscription detail:', error);
      setSubscriptionDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDetailClick = (id: string) => {
    setSelectedSubscriptionId(id);
    fetchSubscriptionDetail(id);
  };

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
          changeType="neutral"
          icon={AlertCircle}
          subtitle=""
        />
      </div>

      {/* Filters */}
      <ChartCard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange.from && !dateRange.to && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecionar período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange.from || new Date()}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range: { from: Date | undefined; to: Date | undefined } | undefined) => {
                  setDateRange({
                    from: range?.from,
                    to: range?.to,
                  });
                }}
                numberOfMonths={2}
              />
              <div className="p-3 border-t border-border flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setDateRange({ from: undefined, to: undefined });
                  }}
                >
                  Limpar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </ChartCard>

      {/* Subscriptions Table */}
      <ChartCard title={`${pagination.total} Assinatura${pagination.total !== 1 ? "s" : ""}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando assinaturas...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Assinante
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Plano
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Valor Mensal
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Próxima Cobrança
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-card">
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
                    <Button variant="outline" size="sm" onClick={() => handleDetailClick(sub.id)}>
                      Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Mostrando {((page - 1) * pagination.limit) + 1} - {Math.min(page * pagination.limit, pagination.total)} de {pagination.total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      disabled={loading}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages || loading}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
        </>
        )}
      </ChartCard>

      {/* Subscription Detail Dialog */}
      <Dialog open={selectedSubscriptionId !== null} onOpenChange={(open) => !open && setSelectedSubscriptionId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Assinatura</DialogTitle>
            <DialogDescription>
              Informações completas da assinatura
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : subscriptionDetail ? (
            <div className="space-y-6">
              {/* User Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações do Usuário
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nome</p>
                    <p className="text-sm font-medium text-foreground">{subscriptionDetail.user.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <p className="text-sm font-medium text-foreground">{subscriptionDetail.user.email}</p>
                  </div>
                  {subscriptionDetail.user.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Telefone</p>
                      <p className="text-sm font-medium text-foreground">{subscriptionDetail.user.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ID do Usuário</p>
                    <p className="text-sm font-mono text-foreground">{subscriptionDetail.userId}</p>
                  </div>
                </div>
              </div>

              {/* Plan Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Informações do Plano
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nome do Plano</p>
                    <p className="text-sm font-medium text-foreground">{subscriptionDetail.plan.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Código</p>
                    <p className="text-sm font-medium text-foreground uppercase">{subscriptionDetail.plan.code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Preço Mensal
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      R$ {subscriptionDetail.plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Limite de Conexões</p>
                    <p className="text-sm font-medium text-foreground">
                      {subscriptionDetail.plan.connectionLimit === null ? "Ilimitado" : subscriptionDetail.plan.connectionLimit}
                    </p>
                  </div>
                  {subscriptionDetail.plan.features.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-2">Features</p>
                      <div className="flex flex-wrap gap-2">
                        {subscriptionDetail.plan.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Detalhes da Assinatura
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    {getStatusBadge(subscriptionDetail.status)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ID da Assinatura</p>
                    <p className="text-sm font-mono text-foreground">{subscriptionDetail.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Período Atual - Início</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(subscriptionDetail.currentPeriodStart).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Período Atual - Fim</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(subscriptionDetail.currentPeriodEnd).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {subscriptionDetail.canceledAt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cancelado em</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(subscriptionDetail.canceledAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Criado em</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(subscriptionDetail.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Atualizado em</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(subscriptionDetail.updatedAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Erro ao carregar detalhes da assinatura
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscriptions;

