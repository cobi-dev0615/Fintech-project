import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/hooks/useAuth";
import { getToastVariantForApiError } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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

const NotificationDropdown = () => {
  const { t, i18n } = useTranslation('notifications');
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Dynamic date locale based on language
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;

  // Check if current user is admin
  const isAdmin = user?.role === 'admin';

  // Fetch unread count once on mount – cached, no polling (only when authenticated)
  const { data: unreadData, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: !!user,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Listen for WebSocket notifications
  useWebSocket((message) => {
    if (message.type === 'new_comment' || message.type === 'comment_replied') {
      // Refresh unread count when a new notification arrives
      refetchUnreadCount();
      // If dropdown is open, refresh notifications list
      if (open) {
        fetchNotifications();
      }
      // Show toast notification
      toast({
        title: message.type === 'new_comment'
          ? t('websocket.newComment')
          : t('websocket.commentReplied'),
        description: message.type === 'new_comment'
          ? (message.userName
              ? t('websocket.newCommentDesc', { userName: message.userName })
              : t('websocket.newCommentDescFallback'))
          : t('websocket.commentRepliedDesc'),
      });
    } else if (message.type === 'new_registration') {
      // Refresh unread count for admins when new registration arrives
      refetchUnreadCount();
      if (open) {
        fetchNotifications();
      }
      toast({
        title: t('websocket.newRegistration'),
        description: message.userName && message.userRole
          ? t('websocket.newRegistrationDesc', {
              userName: message.userName,
              userRole: message.userRole
            })
          : t('websocket.newRegistrationDescFallback'),
      });
    } else if (message.type === 'account_approved') {
      // Refresh unread count when account is approved
      refetchUnreadCount();
      if (open) {
        fetchNotifications();
      }
      toast({
        title: t('websocket.accountApproved'),
        description: t('websocket.accountApprovedDesc'),
      });
    } else if (message.type === 'account_rejected') {
      // Refresh unread count when account is rejected
      refetchUnreadCount();
      if (open) {
        fetchNotifications();
      }
      toast({
        title: t('websocket.accountRejected'),
        description: message.reason
          ? t('websocket.accountRejectedWithReason', { reason: message.reason })
          : t('websocket.accountRejectedDesc'),
        variant: 'warning',
      });
    } else if (message.type === 'consultant_invitation') {
      // Refresh unread count when consultant invitation arrives
      refetchUnreadCount();
      if (open) {
        fetchNotifications();
      }
      toast({
        title: t('websocket.consultantInvitation'),
        description: message.consultantName
          ? t('websocket.consultantInvitationDesc', { consultantName: message.consultantName })
          : t('websocket.consultantInvitationDescFallback'),
      });
    } else if (message.type === 'invitation_accepted') {
      // Refresh unread count when customer accepts invitation
      refetchUnreadCount();
      if (open) {
        fetchNotifications();
      }
      toast({
        title: t('websocket.invitationAccepted'),
        description: message.customerName
          ? t('websocket.invitationAcceptedDesc', { customerName: message.customerName })
          : t('websocket.invitationAcceptedDescFallback'),
      });
    } else if (message.type === 'invitation_declined') {
      // Refresh unread count when customer declines invitation
      refetchUnreadCount();
      if (open) {
        fetchNotifications();
      }
      toast({
        title: t('websocket.invitationDeclined'),
        description: message.customerName
          ? t('websocket.invitationDeclinedDesc', { customerName: message.customerName })
          : message.message || t('websocket.invitationDeclinedDescFallback'),
        variant: 'warning',
      });
    } else if (message.type === 'wallet_shared_updated') {
      refetchUnreadCount();
      if (open) {
        fetchNotifications();
      }
      toast({
        title: message.canViewAll ? t('websocket.walletShared') : t('websocket.walletUnshared'),
        description: message.message || (message.customerName
          ? (message.canViewAll
            ? t('websocket.walletSharedDesc', { customerName: message.customerName })
            : t('websocket.walletUnsharedDesc', { customerName: message.customerName }))
          : (message.canViewAll
              ? t('websocket.walletSharedDescFallback')
              : t('websocket.walletUnsharedDescFallback'))),
      });
    }
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.getAll(1, 10);
      // Filter notifications: only show registration-related notifications to admins
      const filteredNotifications = isAdmin
        ? response.notifications
        : response.notifications.filter(
            (n: Notification) =>
              !n.title.includes('Solicitação de Registro') &&
              !n.title.includes('Registro') &&
              !(n.metadata?.userRole && n.title.includes('solicitou registro'))
          );
      setNotifications(filteredNotifications);
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch notifications only when opening the dropdown and user is authenticated
  useEffect(() => {
    if (open && user) {
      fetchNotifications();
    }
  }, [open, user, fetchNotifications]);

  const setUnreadCount = useCallback((value: number | ((prev: number) => number)) => {
    queryClient.setQueryData(['notifications', 'unread-count'], (old: { count: number } | undefined) => ({
      count: typeof value === 'function' ? value(old?.count ?? 0) : value,
    }));
  }, [queryClient]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    } catch (error: any) {
      toast({
        title: t('dropdown.error'),
        description: t('markReadError'),
        variant: getToastVariantForApiError(error),
      });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.isRead) {
        setUnreadCount((prev: number) => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast({
        title: t('dropdown.removed'),
        description: t('dropdown.removedDesc'),
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: t('dropdown.error'),
        description: t('dropdown.removeError'),
        variant: getToastVariantForApiError(error),
      });
    }
  };

  const handleViewAll = () => {
    setOpen(false);
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: dateLocale,
      });
    } catch {
      return '';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    setOpen(false);

    // Navigate to the notifications page based on current route
    const notificationsPath = location.pathname.startsWith('/admin')
      ? '/admin/notifications'
      : location.pathname.startsWith('/consultant')
      ? '/consultant/notifications'
      : '/app/notifications';

    navigate(notificationsPath);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-popover" align="end">
        <div className="flex flex-col h-[300px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">{t('dropdown.title')}</h3>
            <Link
              to={location.pathname.startsWith('/admin')
                ? '/admin/notifications'
                : location.pathname.startsWith('/consultant')
                ? '/consultant/notifications'
                : '/app/notifications'}
              onClick={handleViewAll}
              className="text-sm text-primary hover:underline"
            >
              {t('dropdown.viewAll')}
            </Link>
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1 h-full">
            <div>
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t('dropdown.loading')}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t('dropdown.empty')}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium mb-1 ${
                              !notification.isRead
                                ? 'text-primary'
                                : 'text-foreground'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          {notification.metadata?.project && (
                            <p className="text-xs text-muted-foreground truncate mb-1">
                              {notification.metadata.project}
                            </p>
                          )}
                          {notification.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={(e) => handleDelete(notification.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
