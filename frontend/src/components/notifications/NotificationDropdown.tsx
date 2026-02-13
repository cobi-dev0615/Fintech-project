import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Check } from "lucide-react";
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

const severityDotColor: Record<string, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

// Map WebSocket message types to backend notification preference types
const WS_TO_PREFERENCE_TYPE: Record<string, string> = {
  new_comment: 'message_received',
  comment_replied: 'message_received',
  new_registration: 'account_activity',
  account_approved: 'account_activity',
  account_rejected: 'account_activity',
  consultant_invitation: 'consultant_invitation',
  invitation_accepted: 'consultant_assignment',
  invitation_declined: 'consultant_assignment',
  wallet_shared_updated: 'connection_status',
};

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

  // Cache user notification preferences for filtering WebSocket toasts
  const [preferences, setPreferences] = useState<Record<string, { enabled: boolean; pushEnabled: boolean }>>({});

  // Dynamic date locale based on language
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;

  // Check if current user is admin
  const isAdmin = user?.role === 'admin';

  // Fetch unread count once on mount – cached, no polling (only when authenticated)
  const { data: unreadData, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: !!user,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Load notification preferences once on mount
  useEffect(() => {
    if (!user) return;
    notificationsApi.getPreferences()
      .then(({ preferences: prefs }) => setPreferences(prefs))
      .catch(() => {}); // Fail silently – defaults to showing all
  }, [user]);

  // Check if a WebSocket message type should show a toast based on user preferences
  const isWsNotificationEnabled = useCallback((wsType: string): boolean => {
    const prefType = WS_TO_PREFERENCE_TYPE[wsType];
    if (!prefType || !preferences[prefType]) return true; // default: show
    return preferences[prefType].enabled !== false && preferences[prefType].pushEnabled !== false;
  }, [preferences]);

  // Listen for WebSocket notifications (always refetch counts; toast only if preference enabled)
  useWebSocket((message) => {
    const showToast = isWsNotificationEnabled(message.type);

    if (message.type === 'new_comment' || message.type === 'comment_replied') {
      refetchUnreadCount();
      if (open) fetchNotifications();
      if (showToast) {
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
      }
    } else if (message.type === 'new_registration') {
      refetchUnreadCount();
      if (open) fetchNotifications();
      if (showToast) {
        toast({
          title: t('websocket.newRegistration'),
          description: message.userName && message.userRole
            ? t('websocket.newRegistrationDesc', { userName: message.userName, userRole: message.userRole })
            : t('websocket.newRegistrationDescFallback'),
        });
      }
    } else if (message.type === 'account_approved') {
      refetchUnreadCount();
      if (open) fetchNotifications();
      if (showToast) {
        toast({ title: t('websocket.accountApproved'), description: t('websocket.accountApprovedDesc') });
      }
    } else if (message.type === 'account_rejected') {
      refetchUnreadCount();
      if (open) fetchNotifications();
      if (showToast) {
        toast({
          title: t('websocket.accountRejected'),
          description: message.reason
            ? t('websocket.accountRejectedWithReason', { reason: message.reason })
            : t('websocket.accountRejectedDesc'),
          variant: 'warning',
        });
      }
    } else if (message.type === 'consultant_invitation') {
      refetchUnreadCount();
      if (open) fetchNotifications();
      if (showToast) {
        toast({
          title: t('websocket.consultantInvitation'),
          description: message.consultantName
            ? t('websocket.consultantInvitationDesc', { consultantName: message.consultantName })
            : t('websocket.consultantInvitationDescFallback'),
        });
      }
    } else if (message.type === 'invitation_accepted') {
      refetchUnreadCount();
      if (open) fetchNotifications();
      if (showToast) {
        toast({
          title: t('websocket.invitationAccepted'),
          description: message.customerName
            ? t('websocket.invitationAcceptedDesc', { customerName: message.customerName })
            : t('websocket.invitationAcceptedDescFallback'),
        });
      }
    } else if (message.type === 'invitation_declined') {
      refetchUnreadCount();
      if (open) fetchNotifications();
      if (showToast) {
        toast({
          title: t('websocket.invitationDeclined'),
          description: message.customerName
            ? t('websocket.invitationDeclinedDesc', { customerName: message.customerName })
            : message.message || t('websocket.invitationDeclinedDescFallback'),
          variant: 'warning',
        });
      }
    } else if (message.type === 'wallet_shared_updated') {
      refetchUnreadCount();
      if (open) fetchNotifications();
      if (showToast) {
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
    }
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.getAll(1, 10);
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

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error: any) {
      toast({
        title: t('dropdown.error'),
        description: t('markAllReadError'),
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
    } catch (error: any) {
      toast({
        title: t('dropdown.error'),
        description: t('dropdown.removeError'),
        variant: getToastVariantForApiError(error),
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: false,
        locale: dateLocale,
      });
    } catch {
      return '';
    }
  };

  const getNotificationsPath = () => {
    if (location.pathname.startsWith('/admin')) return '/admin/notifications';
    if (location.pathname.startsWith('/consultant')) return '/consultant/notifications';
    return '/app/notifications';
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      notificationsApi.markAsRead(notification.id).catch(() => {});
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    }
    setOpen(false);
    navigate(getNotificationsPath());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0 bg-popover border-border/50" align="end" sideOffset={8}>
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground">{t('dropdown.title')}</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t('dropdown.markAllRead')}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <ScrollArea className="max-h-[320px]">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t('dropdown.loading')}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t('dropdown.empty')}
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors border-b border-border/30 last:border-b-0"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Severity dot */}
                    <div className="pt-1.5 shrink-0">
                      <span className={`block h-2 w-2 rounded-full ${
                        !notification.isRead
                          ? (severityDotColor[notification.severity] || 'bg-blue-500')
                          : 'bg-muted-foreground/30'
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${
                        !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.createdAt && (
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                      {!notification.isRead && (
                        <button
                          type="button"
                          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-primary hover:bg-muted/50 transition-colors"
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-destructive hover:bg-muted/50 transition-colors"
                        onClick={(e) => handleDelete(notification.id, e)}
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border/50">
            <Link
              to={getNotificationsPath()}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              {t('dropdown.viewAllNotifications')}
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
