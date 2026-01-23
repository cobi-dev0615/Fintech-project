import { useState, useEffect } from "react";
import { Trash2, CheckCheck, Eye } from "lucide-react";
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

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 20;
  const { toast } = useToast();

  const fetchNotifications = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const response = await notificationsApi.getAll(pageNum, itemsPerPage);
      setNotifications(response.notifications);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as notificações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [currentPage]);

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


  const handleViewDetail = (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.linkUrl) {
      window.location.href = notification.linkUrl;
    } else {
      // If no link, show notification details in a dialog or modal
      toast({
        title: notification.title,
        description: notification.message,
      });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
              : 'Todas as notificações foram lidas'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Notifications Table */}
      <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-border">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Carregando notificações...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma notificação encontrada
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">No</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead className="w-40">Data</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((notification, index) => (
                <TableRow
                  key={notification.id}
                  className={!notification.isRead ? 'bg-muted/30' : ''}
                >
                  <TableCell className="w-16 text-center text-sm text-muted-foreground">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-sm font-medium ${
                        !notification.isRead
                          ? 'text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      {notification.title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground line-clamp-2 max-w-lg">
                      {notification.message}
                    </p>
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
                  <TableCell className="w-32 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => handleViewDetail(notification, e)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
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
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {notifications.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, total)} de {total} notificações
          </div>
          <Pagination>
            <PaginationContent>
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
