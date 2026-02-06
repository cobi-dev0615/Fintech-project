import { useState, useEffect } from "react";
import { Search, CreditCard, Loader2, DollarSign, Trash2, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Payment {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  paidAt: string | null;
  provider: string | null;
  providerPaymentId: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  subscription: {
    id: string;
    plan: {
      name: string;
      code: string;
    };
  } | null;
}

interface SubscriptionHistory {
  id: string;
  status: string;
  planName: string;
  planCode: string;
  priceCents: number;
  startedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const PaymentHistory = () => {
  const [activeTab, setActiveTab] = useState<"payments" | "subscriptions">("subscriptions");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<SubscriptionHistory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPaymentHistory({
        status: filterStatus !== "all" ? filterStatus : undefined,
        page,
        limit: 50,
      });
      setPayments(response.payments);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Failed to fetch payment history:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de pagamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getSubscriptionHistory({
        status: filterStatus !== "all" ? filterStatus : undefined,
        page,
        limit: 50,
      });
      setSubscriptions(response.history);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Failed to fetch subscription history:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de assinaturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterStatus !== "all" || searchQuery) {
        setPage(1);
      }
      if (activeTab === "payments") {
        fetchPayments();
      } else {
        fetchSubscriptions();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [filterStatus, page, searchQuery, activeTab]);

  // Reset page when switching tabs
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const filteredPayments = payments.filter((payment) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payment.user.email.toLowerCase().includes(query) ||
      payment.user.name.toLowerCase().includes(query) ||
      payment.providerPaymentId?.toLowerCase().includes(query) ||
      payment.id.toLowerCase().includes(query)
    );
  });

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      subscription.user.email.toLowerCase().includes(query) ||
      subscription.user.name.toLowerCase().includes(query) ||
      subscription.planName.toLowerCase().includes(query) ||
      subscription.id.toLowerCase().includes(query)
    );
  });

  const totalRevenue = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountCents, 0);

  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const failedCount = payments.filter((p) => p.status === 'failed').length;

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: "bg-success/10 text-success",
      pending: "bg-warning/10 text-warning",
      failed: "bg-destructive/10 text-destructive",
      refunded: "bg-muted text-muted-foreground",
    };
    const labels = {
      paid: "Pago",
      pending: "Pendente",
      failed: "Falhou",
      refunded: "Reembolsado",
    };
    return (
      <Badge className={styles[status as keyof typeof styles] || "bg-muted text-muted-foreground"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatPrice = (cents: number) => {
    const reais = cents / 100;
    return `R$ ${reais.toFixed(2).replace('.', ',')}`;
  };

  const handleDeleteClick = (payment: Payment) => {
    setPaymentToDelete(payment);
    setSubscriptionToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSubscriptionClick = (subscription: SubscriptionHistory) => {
    setSubscriptionToDelete(subscription);
    setPaymentToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    try {
      setDeleting(true);
      await adminApi.deletePayment(paymentToDelete.id);

      toast({
        title: "Sucesso",
        description: "Pagamento excluído com sucesso",
      });

      setIsDeleteDialogOpen(false);
      setPaymentToDelete(null);

      // Refetch payments to ensure data consistency
      await fetchPayments();
    } catch (err: any) {
      console.error('Error deleting payment:', err);
      toast({
        title: "Erro",
        description: err?.error || err?.response?.data?.error || "Erro ao excluir pagamento",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!subscriptionToDelete) return;

    try {
      setDeleting(true);
      await adminApi.deleteSubscription(subscriptionToDelete.id);

      toast({
        title: "Sucesso",
        description: "Assinatura excluída com sucesso",
      });

      setIsDeleteDialogOpen(false);
      setSubscriptionToDelete(null);

      // Refetch subscriptions to ensure data consistency
      await fetchSubscriptions();
    } catch (err: any) {
      console.error('Error deleting subscription:', err);
      toast({
        title: "Erro",
        description: err?.error || err?.response?.data?.error || "Erro ao excluir assinatura",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Compras de Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize todas as compras de planos e pagamentos realizados na plataforma
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "subscriptions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="inline h-4 w-4 mr-2" />
          Histórico de Assinaturas
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "payments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="inline h-4 w-4 mr-2" />
          Histórico de Pagamentos
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Receita Total"
          value={formatPrice(totalRevenue)}
          change=""
          changeType="neutral"
          icon={DollarSign}
          subtitle="pagamentos aprovados"
        />
        <ProfessionalKpiCard
          title="Pagamentos Aprovados"
          value={paidCount.toString()}
          change=""
          changeType="neutral"
          icon={CreditCard}
          subtitle="concluídos"
        />
        <ProfessionalKpiCard
          title="Pagamentos Pendentes"
          value={pendingCount.toString()}
          change=""
          changeType="neutral"
          icon={CreditCard}
          subtitle="aguardando"
        />
        <ProfessionalKpiCard
          title="Pagamentos Falhos"
          value={failedCount.toString()}
          change=""
          changeType="negative"
          icon={CreditCard}
          subtitle="com erro"
        />
      </div>

      {/* Filters */}
      <ChartCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "payments" ? "Buscar por usuário, email ou ID do pagamento..." : "Buscar por usuário, email ou nome do plano..."}
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
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ChartCard>

      {/* Subscriptions Table */}
      {activeTab === "subscriptions" && (
        <ChartCard title={`${pagination.total} Assinatura${pagination.total !== 1 ? "s" : ""}`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Data
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Usuário
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Plano
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Preço
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card">
                    {filteredSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma assinatura encontrada
                        </td>
                      </tr>
                    ) : (
                      filteredSubscriptions.map((subscription) => (
                        <tr
                          key={subscription.id}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 px-4 text-center">
                            <div className="text-sm text-foreground">
                              {format(new Date(subscription.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(subscription.createdAt), "HH:mm:ss", { locale: ptBR })}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="text-sm font-medium text-foreground">{subscription.user.name}</div>
                            <div className="text-xs text-muted-foreground">{subscription.user.email}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm text-foreground">
                              {subscription.planName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm font-semibold text-foreground">
                              {formatPrice(subscription.priceCents)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={
                              subscription.status === 'active' ? "bg-success/10 text-success" :
                              subscription.status === 'past_due' ? "bg-warning/10 text-warning" :
                              subscription.status === 'canceled' ? "bg-destructive/10 text-destructive" :
                              subscription.status === 'trialing' ? "bg-blue-500/10 text-blue-500" :
                              "bg-muted text-muted-foreground"
                            }>
                              {subscription.status === 'active' ? 'Ativo' :
                               subscription.status === 'past_due' ? 'Atrasado' :
                               subscription.status === 'canceled' ? 'Cancelado' :
                               subscription.status === 'trialing' ? 'Período de Teste' :
                               subscription.status === 'paused' ? 'Pausado' :
                               subscription.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 mx-auto"
                              onClick={() => handleDeleteSubscriptionClick(subscription)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {getPageNumbers().map((pageNum, idx) => (
                      pageNum === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                      ) : (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum as number)}
                          className="h-8 w-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.page === pagination.totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </ChartCard>
      )}

      {/* Payments Table */}
      {activeTab === "payments" && (
        <ChartCard title={`${pagination.total} Pagamento${pagination.total !== 1 ? "s" : ""}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Data
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Usuário
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Plano
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Valor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Provedor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      ID do Pagamento
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-center">
                          <div className="text-sm text-foreground">
                            {format(new Date(payment.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.createdAt), "HH:mm:ss", { locale: ptBR })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="text-sm font-medium text-foreground">{payment.user.name}</div>
                          <div className="text-xs text-muted-foreground">{payment.user.email}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-foreground">
                            {payment.subscription?.plan.name || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-semibold text-foreground">
                            {formatPrice(payment.amountCents)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-muted-foreground">
                            {payment.provider || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs font-mono text-muted-foreground">
                            {payment.providerPaymentId?.slice(0, 20) || payment.id.slice(0, 8)}
                            {payment.providerPaymentId && payment.providerPaymentId.length > 20 && "..."}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 mx-auto"
                            onClick={() => handleDeleteClick(payment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Enhanced Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {getPageNumbers().map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                    ) : (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum as number)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page === pagination.totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </ChartCard>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentToDelete ? (
                <>
                  Tem certeza que deseja excluir o pagamento de <strong>{paymentToDelete.user.name}</strong>?
                  <br />
                  <span className="text-sm text-muted-foreground mt-2 block">
                    Valor: {formatPrice(paymentToDelete.amountCents)}
                    <br />
                    Data: {format(new Date(paymentToDelete.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </>
              ) : subscriptionToDelete ? (
                <>
                  Tem certeza que deseja excluir a assinatura de <strong>{subscriptionToDelete.user.name}</strong>?
                  <br />
                  <span className="text-sm text-muted-foreground mt-2 block">
                    Plano: {subscriptionToDelete.planName}
                    <br />
                    Preço: {formatPrice(subscriptionToDelete.priceCents)}
                    <br />
                    Data: {format(new Date(subscriptionToDelete.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </>
              ) : null}
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={paymentToDelete ? handleDeletePayment : handleDeleteSubscription}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentHistory;
