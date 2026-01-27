import { useState, useEffect } from "react";
import { Search, CreditCard, Loader2, DollarSign, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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

const PaymentHistory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [payments, setPayments] = useState<Payment[]>([]);
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
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      if (filterStatus !== "all" || searchQuery) {
        setPage(1);
      }
      fetchPayments();
    }, 300);

    return () => clearTimeout(timer);
  }, [filterStatus, page, searchQuery]);

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

      // Remove from local state
      setPayments(payments.filter(p => p.id !== paymentToDelete.id));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));

      setIsDeleteDialogOpen(false);
      setPaymentToDelete(null);
    } catch (err: any) {
      console.error('Error deleting payment:', err);
      toast({
        title: "Erro",
        description: err?.error || "Erro ao excluir pagamento",
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
          <h1 className="text-2xl font-bold text-foreground">Histórico de Pagamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize todos os pagamentos de planos realizados na plataforma
          </p>
        </div>
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
          changeType="warning"
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
              placeholder="Buscar por usuário, email ou ID do pagamento..."
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

      {/* Payments Table */}
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
                        <td className="py-3 px-4">
                          <div className="text-sm text-foreground">
                            {format(new Date(payment.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.createdAt), "HH:mm:ss", { locale: ptBR })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-foreground">{payment.user.name}</div>
                          <div className="text-xs text-muted-foreground">{payment.user.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-foreground">
                            {payment.subscription?.plan.name || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-semibold text-foreground">
                            {formatPrice(payment.amountCents)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {payment.provider || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-mono text-muted-foreground">
                            {payment.providerPaymentId?.slice(0, 20) || payment.id.slice(0, 8)}
                            {payment.providerPaymentId && payment.providerPaymentId.length > 20 && "..."}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pagamento de <strong>{paymentToDelete?.user.name}</strong>?
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                Valor: {paymentToDelete && formatPrice(paymentToDelete.amountCents)}
                <br />
                Data: {paymentToDelete && format(new Date(paymentToDelete.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
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
