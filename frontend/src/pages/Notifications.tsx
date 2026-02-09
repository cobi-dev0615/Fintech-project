import { useState, useEffect } from "react";
import { Trash2, CheckCheck, Eye, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Notification {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  isRead: boolean;
  linkUrl: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

// Helper function to extract notification type from message
const getNotificationType = (notification: Notification): string => {
  // If message contains ":", extract the part before it as the type
  // This handles cases like "Customer User enviou um novo comentário: title"
  if (notification.message.includes(':')) {
    return notification.message.split(':')[0].trim();
  }
  return notification.message;
};

// Helper function to get notification content from metadata or message
const getNotificationContent = (notification: Notification): string | null => {
  // First check if metadata has content (the actual comment/content)
  if (notification.metadata?.content) {
    return notification.metadata.content;
  }
  // Check for title in metadata (for comments, this is the comment title)
  if (notification.metadata?.title) {
    return notification.metadata.title;
  }
  // If message contains ":", extract the part after it as the content
  // This is a fallback for older notifications
  if (notification.message.includes(':')) {
    const parts = notification.message.split(':');
    if (parts.length > 1) {
      return parts.slice(1).join(':').trim();
    }
  }
  return null;
};

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();

  const fetchNotifications = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await notificationsApi.getAll(pageNum, itemsPerPage);
      setNotifications(response.notifications);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      const isTimeout = status === 504 || status === 408 || /timeout|timed out/i.test(String(error?.message ?? ""));
      const message = isTimeout
        ? "O servidor demorou para responder. Tente novamente em instantes."
        : "Não foi possível carregar as notificações.";
      setLoadError(message);
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 when items per page changes
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    fetchNotifications(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar a notificação como lida.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas as notificações como lidas.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await notificationsApi.delete(deletingId);
      setDeletingId(null);
      
      // If we deleted the last item on the current page and it's not the first page, go to previous page
      if (notifications.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        // Refresh the current page to get updated data and pagination info
        await fetchNotifications(currentPage);
      }
      
      toast({
        title: "Notificação removida",
        description: "A notificação foi removida com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a notificação.",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return '';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getNotificationTypeLabel = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'info':
        return 'Informação';
      case 'warning':
        return 'Aviso';
      case 'critical':
        return 'Crítico';
      default:
        return 'Informação';
    }
  };

  const getNotificationTypeBadgeColor = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'info':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };


  const handleViewDetail = (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    setSelectedNotification(notification);
    setIsDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailDialogOpen(false);
    setSelectedNotification(null);
  };

  const handleNavigateToLink = () => {
    if (selectedNotification?.linkUrl) {
      window.location.href = selectedNotification.linkUrl;
    }
  };

  const handlePageChange = (page: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 3) {
        // Near the beginning
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notificações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
              : 'Todas as notificações foram lidas'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 shrink-0"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Error state with retry (e.g. 504 Gateway Timeout) */}
      {loadError && !loading && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-foreground mb-1">Falha ao carregar</p>
          <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications(currentPage)}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Desktop: Table */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-14 text-center text-muted-foreground font-medium">#</TableHead>
              <TableHead className="text-muted-foreground font-medium">Tipo</TableHead>
              <TableHead className="text-muted-foreground font-medium">Conteúdo</TableHead>
              <TableHead className="w-40 text-muted-foreground font-medium">Data</TableHead>
              <TableHead className="w-40 text-right text-muted-foreground font-medium">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && notifications.length === 0 && !loadError ? (
              <TableRow>
                <TableCell colSpan={5} className="p-12 text-center text-muted-foreground">
                  Carregando notificações...
                </TableCell>
              </TableRow>
            ) : notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="rounded-full bg-muted/50 p-5 mb-4">
                      <Bell className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-base font-medium text-foreground">Nenhuma notificação</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      Novas notificações aparecerão aqui quando você receber convites, mensagens ou alertas dos consultores.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((notification, index) => (
                <TableRow
                  key={notification.id}
                  className={!notification.isRead ? 'bg-muted/30' : ''}
                >
                  <TableCell className="w-16 text-center text-sm text-muted-foreground">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getNotificationTypeBadgeColor(notification.severity)}`}
                    >
                      {getNotificationTypeLabel(notification.severity)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p
                        className={`text-sm font-medium ${
                          !notification.isRead
                            ? 'text-primary'
                            : 'text-foreground'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-lg">
                        {notification.message}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="w-40">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(notification.createdAt)}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="w-40 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => handleViewDetail(notification, e)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Card list - no horizontal scroll */}
      <div className="md:hidden space-y-3 min-w-0">
        {loading && notifications.length === 0 && !loadError ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando notificações...
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-3">
              <Bell className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma notificação</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Novas notificações aparecerão aqui quando você receber convites ou alertas.
            </p>
          </div>
        ) : (
          notifications.map((notification, index) => (
            <div
              key={notification.id}
              className={`rounded-xl border border-border bg-card p-4 space-y-3 ${!notification.isRead ? 'bg-muted/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getNotificationTypeBadgeColor(notification.severity)}`}
                >
                  {getNotificationTypeLabel(notification.severity)}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  #{(currentPage - 1) * itemsPerPage + index + 1}
                </span>
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    !notification.isRead ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {notification.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 break-words">
                  {notification.message}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(notification.createdAt)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => handleViewDetail(notification, e)}
                    aria-label="Ver detalhes"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(notification.id);
                    }}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 min-w-0">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
          <p className="text-sm text-muted-foreground min-w-0 break-words" aria-live="polite">
            Mostrando {notifications.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, total)} de {total} notificações
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="items-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
              Itens por página:
            </label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger id="items-per-page" className="w-[4.5rem] h-9" aria-label="Itens por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="min-w-0 max-w-full overflow-x-hidden flex justify-end">
            <Pagination>
            <PaginationContent className="flex-wrap justify-center gap-2 sm:gap-1">
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => handlePageChange(currentPage - 1, e)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  href="#"
                />
              </PaginationItem>
              {getPageNumbers().map((pageNum, index) => (
                <PaginationItem key={index}>
                  {pageNum === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={(e) => handlePageChange(pageNum, e)}
                      isActive={pageNum === currentPage}
                      className="cursor-pointer"
                      href="#"
                    >
                      {pageNum}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => handlePageChange(currentPage + 1, e)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  href="#"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title || "Detalhes da Notificação"}</DialogTitle>
            <DialogDescription>
              Informações completas da notificação
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getNotificationTypeBadgeColor(selectedNotification.severity)}`}
                  >
                    {getNotificationTypeLabel(selectedNotification.severity)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <span className={`text-sm ${selectedNotification.isRead ? 'text-success' : 'text-warning'}`}>
                    {selectedNotification.isRead ? 'Lida' : 'Não lida'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Mensagem:</span>
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm whitespace-pre-wrap">
                  {getNotificationType(selectedNotification)}
                </div>
              </div>
              {(() => {
                const content = getNotificationContent(selectedNotification);
                const hasMetadata = selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0;
                
                // Only show "Informações Adicionais" if there's actual content
                if (content && content.trim() !== '') {
                  return (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Informações Adicionais:</span>
                      <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm whitespace-pre-wrap">
                        {content}
                      </div>
                      {hasMetadata && Object.keys(selectedNotification.metadata).filter(k => k !== 'content' && k !== 'title').length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver metadados completos
                          </summary>
                          <pre className="text-xs text-foreground overflow-auto mt-2 p-2 bg-muted/20 rounded">
                            {JSON.stringify(selectedNotification.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                }
                // If content is empty, don't show the section at all
                return null;
              })()}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Data de Criação:</span>
                <div className="text-sm text-foreground">
                  <div>{formatDate(selectedNotification.createdAt)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTimeAgo(selectedNotification.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDetail}>
              Fechar
            </Button>
            {selectedNotification?.linkUrl && (
              <Button onClick={handleNavigateToLink}>
                Ir para Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover notificação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta notificação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notifications;
