import { useState, useEffect } from "react";
import { Search, LogIn, Loader2, Shield, CheckCircle2, XCircle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
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

interface LoginHistory {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const LIMIT_OPTIONS = [5, 10, 20];

const LoginHistory = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;
  const [searchQuery, setSearchQuery] = useState("");
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<LoginHistory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLoginHistory = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getLoginHistory({
          page,
          limit: pageSize,
        });
        setLoginHistory(response.loginHistory);
        setPagination(response.pagination);
      } catch (error: any) {
        console.error('Failed to fetch login history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLoginHistory();
  }, [page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // Reset to page 1 when search changes
  useEffect(() => {
    if (searchQuery && page !== 1) {
      setPage(1);
    }
  }, [searchQuery]);

  const filteredHistory = loginHistory.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.user.email.toLowerCase().includes(query) ||
      entry.user.name.toLowerCase().includes(query) ||
      entry.ipAddress?.toLowerCase().includes(query) ||
      entry.id.toLowerCase().includes(query)
    );
  });

  const successfulLogins = loginHistory.filter((e) => e.success).length;
  const failedLogins = loginHistory.filter((e) => !e.success).length;
  const uniqueIPs = new Set(loginHistory.map((e) => e.ipAddress).filter(Boolean)).size;

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-destructive/10 text-destructive",
      consultant: "bg-primary/10 text-primary",
      customer: "bg-success/10 text-success",
    };
    const getRoleLabel = (r: string) => {
      if (r === 'admin') return t('admin:userManagement.roles.admin');
      if (r === 'consultant') return t('admin:userManagement.roles.consultant');
      if (r === 'customer') return t('admin:userManagement.roles.customer');
      return r;
    };
    return (
      <Badge className={styles[role as keyof typeof styles] || "bg-muted text-muted-foreground"}>
        {getRoleLabel(role)}
      </Badge>
    );
  };

  const handleDeleteClick = (record: LoginHistory) => {
    setRecordToDelete(record);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      setDeleting(true);
      await adminApi.deleteLoginHistory(recordToDelete.id);

      toast({
        title: t('common:success'),
        description: t('admin:loginHistory.deleteSuccess'),
      });

      // Remove from local state
      setLoginHistory(loginHistory.filter(r => r.id !== recordToDelete.id));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));

      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    } catch (err: any) {
      console.error('Error deleting login history record:', err);
      toast({
        title: t('common:error'),
        description: err?.error || t('admin:loginHistory.deleteError'),
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
          <h1 className="text-2xl font-bold text-foreground">{t('admin:loginHistory.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin:loginHistory.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ChartCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin:loginHistory.stats.successful')}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{successfulLogins}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
          </div>
        </ChartCard>
        <ChartCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin:loginHistory.stats.failed')}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{failedLogins}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </ChartCard>
        <ChartCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin:loginHistory.stats.uniqueIPs')}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{uniqueIPs}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Filters */}
      <ChartCard>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin:loginHistory.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </ChartCard>

      {/* Login History Table */}
      <ChartCard title={`${pagination.total} ${pagination.total === 1 ? t('admin:loginHistory.attempt') : t('admin:loginHistory.attempts')}`}>
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
                      {t('admin:loginHistory.tableHeaders.dateTime')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:loginHistory.tableHeaders.user')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:loginHistory.tableHeaders.role')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:loginHistory.tableHeaders.ipAddress')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:loginHistory.tableHeaders.browserDevice')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:loginHistory.tableHeaders.status')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin:loginHistory.tableHeaders.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('admin:loginHistory.empty')}
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="text-sm text-foreground">
                            {format(new Date(entry.createdAt), "dd/MM/yyyy", { locale: dateLocale })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), "HH:mm:ss", { locale: dateLocale })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-foreground">{entry.user.name}</div>
                          <div className="text-xs text-muted-foreground">{entry.user.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          {getRoleBadge(entry.user.role)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-mono text-foreground">
                            {entry.ipAddress || t('common:notAvailable')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-muted-foreground" title={entry.userAgent || ""}>
                            {entry.userAgent 
                              ? (entry.userAgent.length > 50 
                                ? entry.userAgent.substring(0, 50) + "..." 
                                : entry.userAgent)
                              : t('common:notAvailable')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {entry.success ? (
                            <Badge className="bg-success/10 text-success">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t('admin:loginHistory.status.success')}
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/10 text-destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              {t('admin:loginHistory.status.failed')}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                            onClick={() => handleDeleteClick(entry)}
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

            {/* Pagination + page size */}
            {(pagination.total > 0 || pagination.totalPages > 1) && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    {t('common:showingResults', {
                      from: ((pagination.page - 1) * pagination.limit) + 1,
                      to: Math.min(pagination.page * pagination.limit, pagination.total),
                      total: pagination.total
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('common:perPage')}</span>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="h-8 w-[100px]" aria-label={t('common:itemsPerPageAria')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIMIT_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {pagination.totalPages > 1 && (
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
                )}
              </div>
            )}
            {pagination.total === 0 && pagination.totalPages <= 1 && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">{t('common:perPage')}</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[100px]" aria-label={t('common:itemsPerPageAria')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIMIT_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
      </ChartCard>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin:loginHistory.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin:loginHistory.deleteDialog.confirm', { name: recordToDelete?.user.name })}
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                {t('admin:loginHistory.emailLabel')}: {recordToDelete?.user.email}
                <br />
                {t('admin:loginHistory.ipLabel')}: {recordToDelete?.ipAddress || t('common:notAvailable')}
                <br />
                {t('admin:loginHistory.deleteDialog.date')}: {recordToDelete && format(new Date(recordToDelete.createdAt), t('admin:loginHistory.dateTimeFormat'), { locale: dateLocale })}
                <br />
                {t('admin:loginHistory.deleteDialog.status')}: {recordToDelete?.success ? t('admin:loginHistory.status.success') : t('admin:loginHistory.status.failed')}
              </span>
              <br />
              {t('admin:loginHistory.deleteDialog.warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecord}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('admin:loginHistory.deleteDialog.deleting') : t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LoginHistory;
