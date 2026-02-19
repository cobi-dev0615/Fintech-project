import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToastVariantForApiError } from "@/lib/utils";
import {
  MessageSquare,
  Send,
  Search,
  MoreVertical,
  Trash2,
  History,
  Paperclip,
  X,
  Download,
  Mail,
  UserCheck,
  Clock,
  GripVertical,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { customerApi, getApiBaseUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

// --- Interfaces ---

interface ConversationItem {
  id: string;
  consultantId: string;
  consultantName: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface Message {
  id: string;
  sender: "client" | "consultant";
  content: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

// --- KPI Card types & component ---

interface MsgKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableMsgKpiCard({ id, kpi }: { id: string; kpi: MsgKpiDef }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "z-50 opacity-50 scale-105" : ""}`}
    >
      <button
        type="button"
        className="drag-handle absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/80 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none rounded-md p-1 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="kpi-card relative overflow-hidden h-full">
        <kpi.watermark className="absolute -bottom-3 -right-3 h-24 w-24 text-muted-foreground/[0.06] pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-3 relative z-10">
          <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground truncate">
            {kpi.title}
          </span>
        </div>

        <div className="relative z-10">
          <div className="text-2xl sm:text-[28px] font-bold text-foreground mb-1 tabular-nums tracking-tight leading-none">
            {kpi.value}
          </div>
          {kpi.change && kpi.changeType !== "neutral" && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`flex items-center gap-0.5 ${
                  kpi.changeType === "positive"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {kpi.changeType === "positive" ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-semibold tabular-nums">
                  {kpi.change}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- KPI IDs ---

const MSG_KPI_IDS = [
  "msg-conversations",
  "msg-unread",
  "msg-consultants",
  "msg-activity",
] as const;

// --- Main component ---

const CustomerMessages = () => {
  const { t, i18n } = useTranslation(["messages", "common"]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const dateLocale =
    i18n.language === "pt-BR" || i18n.language === "pt" ? ptBR : enUS;

  // --- State ---
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [deleteChatDialogOpen, setDeleteChatDialogOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    filename: string;
  } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // --- KPI drag order ---
  const kpiStorageKey = `msg-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === MSG_KPI_IDS.length &&
          MSG_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...MSG_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleKpiDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setKpiOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, moved);
      localStorage.setItem(kpiStorageKey, JSON.stringify(next));
      return next;
    });
  };

  // --- Data fetching ---

  const {
    data: conversationsData,
    isLoading: conversationsLoading,
  } = useQuery({
    queryKey: ["customer", "conversations"],
    queryFn: () => customerApi.getConversations(),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 30000,
  });

  const conversations: ConversationItem[] =
    conversationsData?.conversations || [];

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.consultantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    data: conversationData,
    isLoading: conversationLoading,
  } = useQuery({
    queryKey: ["customer", "conversation", selectedConversation],
    queryFn: () => customerApi.getConversation(selectedConversation!),
    enabled: !!selectedConversation,
    staleTime: 10 * 1000,
    gcTime: 1 * 60 * 1000,
    refetchInterval: 15000,
  });

  const currentConversation = conversationData
    ? {
        id: conversationData.conversation.id,
        consultantId: conversationData.conversation.consultantId,
        consultantName: conversationData.conversation.consultantName,
        messages: (conversationData.messages || []) as Message[],
      }
    : null;

  // --- WebSocket ---

  useWebSocket((message) => {
    if (message.type === "new_message") {
      queryClient.invalidateQueries({
        queryKey: ["customer", "conversations"],
      });
      if (message.conversationId === selectedConversation) {
        queryClient.invalidateQueries({
          queryKey: ["customer", "conversation", selectedConversation],
        });
      }
    } else if (
      message.type === "conversation_cleared" &&
      message.conversationId === selectedConversation
    ) {
      queryClient.invalidateQueries({
        queryKey: ["customer", "conversation", selectedConversation],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer", "conversations"],
      });
    } else if (message.type === "conversation_deleted") {
      queryClient.invalidateQueries({
        queryKey: ["customer", "conversations"],
      });
      if (message.conversationId === selectedConversation) {
        setSelectedConversation(null);
      }
    }
  });

  // --- KPI data ---

  const kpiValues = useMemo(() => {
    const totalConversations = conversations.length;
    const unreadMessages = conversations.reduce(
      (sum, c) => sum + (c.unread || 0),
      0
    );
    const activeConsultants = new Set(conversations.map((c) => c.consultantId))
      .size;
    let lastActivity = "";
    if (conversations.length > 0) {
      try {
        const sorted = [...conversations].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const mostRecent = new Date(sorted[0].timestamp);
        const now = new Date();
        const diffHours =
          (now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60);
        if (diffHours < 1) {
          lastActivity = t("messages:now");
        } else if (diffHours < 24) {
          lastActivity = formatDistanceToNow(mostRecent, {
            addSuffix: false,
            locale: dateLocale,
          });
        } else {
          lastActivity = format(mostRecent, "dd/MM", { locale: dateLocale });
        }
      } catch {
        lastActivity = "—";
      }
    }
    return { totalConversations, unreadMessages, activeConsultants, lastActivity };
  }, [conversations, t, dateLocale]);

  const kpiData: Record<string, MsgKpiDef> = {
    "msg-conversations": {
      title: t("messages:kpi.totalConversations"),
      value: String(kpiValues.totalConversations),
      changeType: "neutral",
      icon: MessageSquare,
      watermark: MessageSquare,
    },
    "msg-unread": {
      title: t("messages:kpi.unreadMessages"),
      value: String(kpiValues.unreadMessages),
      change:
        kpiValues.unreadMessages > 0
          ? `${kpiValues.unreadMessages} pending`
          : undefined,
      changeType: kpiValues.unreadMessages > 0 ? "negative" : "neutral",
      icon: Mail,
      watermark: Mail,
    },
    "msg-consultants": {
      title: t("messages:kpi.activeConsultants"),
      value: String(kpiValues.activeConsultants),
      change:
        kpiValues.activeConsultants > 0
          ? `${kpiValues.activeConsultants} active`
          : undefined,
      changeType: kpiValues.activeConsultants > 0 ? "positive" : "neutral",
      icon: UserCheck,
      watermark: UserCheck,
    },
    "msg-activity": {
      title: t("messages:kpi.lastActivity"),
      value: kpiValues.lastActivity || t("messages:noActivity"),
      changeType: "neutral",
      icon: Clock,
      watermark: Clock,
    },
  };

  // --- Mutations ---

  const sendMessageMutation = useMutation({
    mutationFn: ({
      conversationId,
      content,
      attachment,
    }: {
      conversationId: string;
      content: string;
      attachment?: { url: string; filename: string };
    }) => customerApi.sendMessage(conversationId, content, attachment),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customer", "conversation", selectedConversation],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer", "conversations"],
      });
      setNewMessage("");
      setPendingAttachment(null);
    },
    onError: (err: any) => {
      toast({
        title: t("common:error"),
        description: t("messages:sendError"),
        variant: getToastVariantForApiError(err),
      });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: (conversationId: string) =>
      customerApi.clearHistory(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customer", "conversation", selectedConversation],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer", "conversations"],
      });
      setClearHistoryDialogOpen(false);
      toast({
        title: t("messages:historyCleared"),
        description: t("messages:historyClearedDesc"),
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: t("common:error"),
        description: t("messages:clearError"),
        variant: getToastVariantForApiError(err),
      });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) =>
      customerApi.deleteConversation(conversationId),
    onSuccess: () => {
      setSelectedConversation(null);
      queryClient.invalidateQueries({
        queryKey: ["customer", "conversations"],
      });
      setDeleteChatDialogOpen(false);
      toast({
        title: t("messages:conversationDeleted"),
        description: t("messages:conversationDeletedDesc"),
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: t("common:error"),
        description: t("messages:deleteError"),
        variant: getToastVariantForApiError(err),
      });
    },
  });

  // --- Handlers ---

  const handleSendMessage = () => {
    if (!selectedConversation) return;
    if (!newMessage.trim() && !pendingAttachment) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: newMessage.trim(),
      attachment: pendingAttachment || undefined,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      "pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "gif", "txt", "csv",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      toast({
        title: t("messages:fileTypeNotAllowed"),
        description: t("messages:fileTypeNotAllowedDesc"),
        variant: "warning",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t("messages:fileTooLarge"),
        description: t("messages:fileTooLargeDesc"),
        variant: "warning",
      });
      return;
    }
    setUploadingFile(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const data = (r.result as string).split(",")[1];
          resolve(data || "");
        };
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await customerApi.uploadMessageFile(base64, file.name);
      setPendingAttachment({ url: res.url, filename: res.filename });
    } catch (err: any) {
      toast({
        title: t("common:error"),
        description: t("messages:uploadError"),
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours =
        (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return formatDistanceToNow(date, {
          addSuffix: true,
          locale: dateLocale,
        });
      } else if (diffInHours < 48) {
        return `${t("messages:yesterday")} ${format(date, "HH:mm", { locale: dateLocale })}`;
      } else {
        return format(date, "dd/MM/yyyy HH:mm", { locale: dateLocale });
      }
    } catch {
      return timestamp;
    }
  };

  const formatConversationTime = (timestamp: string) => {
    try {
      if (timestamp === "Nunca") return t("messages:never");
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours =
        (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        return t("messages:now");
      } else if (diffInHours < 24) {
        return formatDistanceToNow(date, {
          addSuffix: true,
          locale: dateLocale,
        });
      } else {
        return format(date, "dd/MM/yyyy", { locale: dateLocale });
      }
    } catch {
      return timestamp;
    }
  };

  // --- Auto-scroll ---

  useEffect(() => {
    if (messagesEndRef.current && currentConversation?.messages) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentConversation?.messages]);

  // --- Render ---

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6">
      {/* KPI Cards Row — Draggable */}
      <DndContext
        sensors={kpiSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleKpiDragEnd}
      >
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpiOrder.map((id) => {
              const kpi = kpiData[id];
              if (!kpi) return null;
              return <SortableMsgKpiCard key={id} id={id} kpi={kpi} />;
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Main Content: Conversations List + Chat Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Conversation List */}
        <div className="lg:col-span-4">
          <div className="chart-card flex flex-col overflow-hidden !p-0" style={{ minHeight: "60vh" }}>
            {/* List header */}
            <div className="flex items-center gap-3 p-3 border-b border-white/10 shrink-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("messages:conversations")}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {t("messages:selectToOpen")}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-white/10 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t("messages:searchPlaceholder")}
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t("messages:searchLabel")}
                />
              </div>
            </div>

            {/* Conversation items */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-1 p-2">
                {conversationsLoading ? (
                  <div className="space-y-2 p-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4 rounded-lg border border-dashed border-border bg-muted/20 min-h-[160px]">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-foreground">
                      {searchQuery
                        ? t("messages:noConversationsFound")
                        : t("messages:noConversations")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery
                        ? t("messages:tryDifferentSearch")
                        : t("messages:noConversationsDesc")}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() =>
                        setSelectedConversation(conversation.id)
                      }
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors border",
                        selectedConversation === conversation.id
                          ? "bg-primary/10 border-primary/30"
                          : "border-transparent hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-primary">
                                {conversation.consultantName
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">
                                {conversation.consultantName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {conversation.lastMessage || "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                            {formatConversationTime(conversation.timestamp)}
                          </span>
                          {conversation.unread > 0 && (
                            <Badge className="bg-primary text-primary-foreground text-xs min-w-[20px] justify-center h-5">
                              {conversation.unread > 99
                                ? "99+"
                                : conversation.unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-8">
          <div className="chart-card flex flex-col overflow-hidden !p-0" style={{ minHeight: "60vh" }}>
            {conversationLoading ? (
              <div className="flex-1 flex flex-col p-4 gap-4">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-3/4 rounded-lg ml-auto" />
                <Skeleton className="h-24 w-1/2 rounded-lg" />
              </div>
            ) : currentConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 shrink-0 bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {currentConversation.consultantName
                          ?.charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {currentConversation.consultantName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("messages:consultant")}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setClearHistoryDialogOpen(true)}
                        >
                          <History className="h-4 w-4 mr-2" />
                          {t("messages:clearHistory")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteChatDialogOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("messages:deleteConversation")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages area */}
                <div
                  className="flex-1 min-h-0 max-h-[min(60vh,calc(100vh-26rem))] overflow-y-auto overflow-x-hidden overscroll-contain p-4 pb-0"
                  ref={scrollAreaRef}
                  style={{ overscrollBehavior: "contain" }}
                >
                  <div className="space-y-4 pb-24">
                    {currentConversation.messages.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground mb-3">
                          <MessageSquare className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {t("messages:noMessages")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("messages:sendFirstMessage")}
                        </p>
                      </div>
                    ) : (
                      currentConversation.messages.map(
                        (message: Message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.sender === "client"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={cn(
                                "max-w-[75%] sm:max-w-[70%] rounded-xl px-3 py-2.5 shadow-sm",
                                message.sender === "client"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground border border-white/10"
                              )}
                            >
                              {message.content ? (
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                              ) : null}
                              {message.attachmentUrl &&
                                message.attachmentName && (
                                  <div className="flex items-center gap-2 mt-1.5 p-2 rounded-lg bg-black/10 dark:bg-white/10">
                                    <Paperclip className="h-3.5 w-3.5 flex-shrink-0 opacity-90" />
                                    <a
                                      href={
                                        getApiBaseUrl().replace(
                                          /\/api\/?$/,
                                          ""
                                        ) + message.attachmentUrl
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm underline truncate flex-1 min-w-0"
                                    >
                                      {message.attachmentName}
                                    </a>
                                    <a
                                      href={
                                        getApiBaseUrl().replace(
                                          /\/api\/?$/,
                                          ""
                                        ) + message.attachmentUrl
                                      }
                                      download={message.attachmentName}
                                      rel="noopener noreferrer"
                                      className="flex-shrink-0 p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
                                      title={t("messages:downloadFile")}
                                      aria-label={t("messages:downloadFile")}
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </div>
                                )}
                              <p
                                className={cn(
                                  "text-[11px] mt-1.5 opacity-80",
                                  message.sender === "client"
                                    ? "text-primary-foreground/90"
                                    : "text-muted-foreground"
                                )}
                              >
                                {formatMessageTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        )
                      )
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message input */}
                <div className="flex-shrink-0 bg-muted/10 border-t border-white/10 p-4">
                  {pendingAttachment && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate flex-1">
                        {pendingAttachment.filename}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setPendingAttachment(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                      onChange={handleFileSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      disabled={
                        uploadingFile || sendMessageMutation.isPending
                      }
                      onClick={() => fileInputRef.current?.click()}
                      aria-label={t("messages:attachFile")}
                    >
                      {uploadingFile ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                    <Textarea
                      placeholder={t("messages:messagePlaceholder")}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="icon"
                      className="flex-shrink-0"
                      disabled={
                        sendMessageMutation.isPending ||
                        (!newMessage.trim() && !pendingAttachment)
                      }
                    >
                      {sendMessageMutation.isPending ? (
                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div className="max-w-sm">
                  <div className="flex justify-center mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                      <MessageSquare className="h-8 w-8" />
                    </div>
                  </div>
                  <p className="font-medium text-foreground mb-1">
                    {t("messages:selectConversation")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("messages:selectConversationDesc")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear History Dialog */}
      <AlertDialog
        open={clearHistoryDialogOpen}
        onOpenChange={setClearHistoryDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("messages:clearHistoryConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("messages:clearHistoryConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearHistoryMutation.isPending}>
              {t("common:cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedConversation &&
                clearHistoryMutation.mutate(selectedConversation)
              }
              disabled={clearHistoryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearHistoryMutation.isPending
                ? t("messages:clearing")
                : t("messages:clear")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Conversation Dialog */}
      <AlertDialog
        open={deleteChatDialogOpen}
        onOpenChange={setDeleteChatDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("messages:deleteConversationConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("messages:deleteConversationConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConversationMutation.isPending}>
              {t("common:cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedConversation &&
                deleteConversationMutation.mutate(selectedConversation)
              }
              disabled={deleteConversationMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConversationMutation.isPending
                ? t("messages:deleting")
                : t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerMessages;
