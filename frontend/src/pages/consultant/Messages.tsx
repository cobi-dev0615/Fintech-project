import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Send, Search, UserPlus, Calendar, Plus, MoreVertical, Trash2, History, Paperclip, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { consultantApi, getApiBaseUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface ConversationItem {
  id: string;
  clientId: string;
  clientName: string;
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

interface Conversation {
  id: string;
  clientId: string;
  clientName: string;
  messages: Message[];
}

interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
}

const Messages = () => {
  const { t, i18n } = useTranslation(['consultant', 'common']);
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [deleteChatDialogOpen, setDeleteChatDialogOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; filename: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['consultant', 'conversations'],
    queryFn: () => consultantApi.getConversations(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch clients for create conversation dialog
  const { data: clientsData } = useQuery({
    queryKey: ['consultant', 'clients', 'active'],
    queryFn: () => consultantApi.getClients({ status: 'active', limit: 100 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const conversations = conversationsData?.conversations || [];
  const clients = clientsData?.clients || [];
  // Clients not yet in a conversation (hide already-connected from "Nova Conversa" dropdown)
  const connectedClientIds = new Set(conversations.map((c) => c.clientId));
  const availableClients = clients.filter((c) => !connectedClientIds.has(c.id));

  // Real-time: subscribe to new messages and conversation updates
  useWebSocket((message) => {
    if (message.type === 'new_message') {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversations'] });
      if (message.conversationId === selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ['consultant', 'conversation', selectedConversation] });
      }
    } else if (message.type === 'conversation_cleared' && message.conversationId === selectedConversation) {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversation', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversations'] });
    } else if (message.type === 'conversation_deleted') {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversations'] });
      if (message.conversationId === selectedConversation) {
        setSelectedConversation(null);
      }
    }
  });

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) =>
    conv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch selected conversation messages
  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ['consultant', 'conversation', selectedConversation],
    queryFn: () => consultantApi.getConversation(selectedConversation!),
    enabled: !!selectedConversation,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 15000, // Refetch every 15 seconds when conversation is open
  });

  const currentConversation = conversationData ? {
    id: conversationData.conversation.id,
    clientId: conversationData.conversation.clientId,
    clientName: conversationData.conversation.clientName,
    messages: conversationData.messages || [],
  } : null;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && currentConversation?.messages) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentConversation?.messages]);

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: (customerId: string) => consultantApi.createConversation(customerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversations'] });
      setSelectedConversation(data.conversation.id);
      setIsCreateDialogOpen(false);
      setSelectedClientId("");
      toast({
        title: t('consultant:messages.conversationCreated'),
        description: t('consultant:messages.conversationCreatedDesc', { clientName: data.conversation.clientName }),
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:messages.createError'),
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({
      conversationId,
      content,
      attachment,
    }: {
      conversationId: string;
      content: string;
      attachment?: { url: string; filename: string };
    }) => consultantApi.sendMessage(conversationId, content, attachment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversation', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversations'] });
      setNewMessage("");
      setPendingAttachment(null);
    },
    onError: (err: any) => {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:messages.sendError'),
        variant: "destructive",
      });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: (conversationId: string) => consultantApi.clearHistory(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversation', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversations'] });
      setClearHistoryDialogOpen(false);
      toast({
        title: t('consultant:messages.historyCleared'),
        description: t('consultant:messages.historyClearedDesc'),
        variant: "success"
      });
    },
    onError: (err: any) => {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:messages.clearError'),
        variant: "destructive"
      });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => consultantApi.deleteConversation(conversationId),
    onSuccess: () => {
      setSelectedConversation(null);
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversations'] });
      setDeleteChatDialogOpen(false);
      toast({
        title: t('consultant:messages.conversationDeleted'),
        description: t('consultant:messages.conversationDeletedDesc'),
        variant: "success"
      });
    },
    onError: (err: any) => {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:messages.deleteError'),
        variant: "destructive"
      });
    },
  });

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
    const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      toast({
        title: t('consultant:messages.fileTypeNotAllowed'),
        description: t('consultant:messages.fileTypeNotAllowedDesc'),
        variant: "destructive"
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('consultant:messages.fileTooLarge'),
        description: t('consultant:messages.fileTooLargeDesc'),
        variant: "destructive"
      });
      return;
    }
    setUploadingFile(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const data = (r.result as string).split(',')[1];
          resolve(data || '');
        };
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await consultantApi.uploadMessageFile(base64, file.name);
      setPendingAttachment({ url: res.url, filename: res.filename });
    } catch (err: any) {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:messages.uploadError'),
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleCreateConversation = () => {
    if (!selectedClientId) {
      toast({
        title: t('common:error'),
        description: t('consultant:messages.selectClientError'),
        variant: "destructive",
      });
      return;
    }
    createConversationMutation.mutate(selectedClientId);
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
      } else if (diffInHours < 48) {
        return `${t('consultant:messages.yesterday')} ${format(date, 'HH:mm', { locale: dateLocale })}`;
      } else {
        return format(date, 'dd/MM/yyyy HH:mm', { locale: dateLocale });
      }
    } catch {
      return timestamp;
    }
  };

  const formatConversationTime = (timestamp: string) => {
    try {
      if (timestamp === 'Nunca') return t('consultant:messages.never');
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        return t('consultant:messages.now');
      } else if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
      } else {
        return format(date, 'dd/MM/yyyy', { locale: dateLocale });
      }
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Page Header */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('consultant:messages.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
            {t('consultant:messages.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/consultant/invitations')}>
            <UserPlus className="h-4 w-4 mr-2 shrink-0" />
            {t('consultant:messages.sendInvite')}
          </Button>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            {t('consultant:messages.newConversation')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0">
        {/* Conversations List */}
        <div className="rounded-xl border-2 border-blue-500/70 bg-card flex flex-col min-h-0 overflow-hidden shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow">
          <div className="flex items-center gap-3 p-3 border-b border-border shrink-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{t('consultant:messages.conversations')}</h2>
              <p className="text-xs text-muted-foreground truncate">{t('consultant:messages.selectToOpen')}</p>
            </div>
          </div>
          <div className="p-3 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('consultant:messages.searchPlaceholder')}
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t('consultant:messages.searchLabel')}
              />
            </div>
          </div>
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
                    {searchQuery ? t('consultant:messages.noConversationsFound') : t('consultant:messages.noConversations')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? t('consultant:messages.tryDifferentSearch') : t('consultant:messages.startConversation')}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline" size="sm" className="mt-3">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('consultant:messages.newConversation')}
                    </Button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
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
                              {conversation.clientName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {conversation.clientName}
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
                            {conversation.unread > 99 ? "99+" : conversation.unread}
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

        {/* Chat panel */}
        <div className="lg:col-span-2 min-h-0 flex flex-col rounded-xl border-2 border-violet-500/70 bg-card overflow-hidden shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-shadow">
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
                <div className="p-4 border-b border-border shrink-0 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {currentConversation?.clientName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {currentConversation?.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('consultant:messages.client')}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setClearHistoryDialogOpen(true)}>
                          <History className="h-4 w-4 mr-2" />
                          {t('consultant:messages.clearHistory')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteChatDialogOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('consultant:messages.deleteConversation')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Chat area: only this part scrolls (not header, not input block) */}
                <div
                  className="flex-1 min-h-0 max-h-[min(70vh,calc(100vh-21rem))] overflow-y-auto overflow-x-hidden overscroll-contain p-4 pb-0"
                  ref={scrollAreaRef}
                  style={{ overscrollBehavior: 'contain' }}
                >
                  <div className="space-y-4 pb-24">
                    {currentConversation?.messages?.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground mb-3">
                          <MessageSquare className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-medium text-foreground">{t('consultant:messages.noMessages')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('consultant:messages.sendFirstMessage')}</p>
                      </div>
                    ) : (
                      currentConversation?.messages?.map((message: Message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === "consultant" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] sm:max-w-[70%] rounded-xl px-3 py-2.5 shadow-sm",
                              message.sender === "consultant"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground border border-border/50"
                            )}
                          >
                            {message.content ? <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p> : null}
                            {message.attachmentUrl && message.attachmentName && (
                              <div className="flex items-center gap-2 mt-1.5 p-2 rounded-lg bg-black/10 dark:bg-white/10">
                                <Paperclip className="h-3.5 w-3.5 flex-shrink-0 opacity-90" />
                                <a href={getApiBaseUrl().replace(/\/api\/?$/, "") + message.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline truncate flex-1 min-w-0">
                                  {message.attachmentName}
                                </a>
                                <a href={getApiBaseUrl().replace(/\/api\/?$/, "") + message.attachmentUrl} download={message.attachmentName} rel="noopener noreferrer" className="flex-shrink-0 p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10" title={t('consultant:messages.downloadFile')} aria-label={t('consultant:messages.downloadFile')}>
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            )}
                            <p
                              className={cn(
                                "text-[11px] mt-1.5 opacity-80",
                                message.sender === "consultant" ? "text-primary-foreground/90" : "text-muted-foreground"
                              )}
                            >
                              {formatMessageTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message input block - no scroll, fixed at bottom */}
                <div className="flex-shrink-0 bg-muted/20 border-t border-border p-4">
                  {pendingAttachment && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <span className="truncate flex-1">{pendingAttachment.filename}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPendingAttachment(null)}>
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
                      disabled={uploadingFile || sendMessageMutation.isPending}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label={t('consultant:messages.attachFile')}
                    >
                      {uploadingFile ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                    <Textarea
                      placeholder={t('consultant:messages.messagePlaceholder')}
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
                      disabled={sendMessageMutation.isPending || (!newMessage.trim() && !pendingAttachment)}
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
                    {t('consultant:messages.selectConversation')}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('consultant:messages.selectConversationDesc')}
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('consultant:messages.newConversation')}
                  </Button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Create Conversation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="gap-6 sm:max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle>{t('consultant:messages.newConversation')}</DialogTitle>
            <DialogDescription>
              {t('consultant:messages.selectClientToStart')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t('consultant:messages.selectClient')} />
              </SelectTrigger>
              <SelectContent>
                {availableClients.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {clients.length === 0
                      ? t('consultant:messages.noActiveClients')
                      : t('consultant:messages.allClientsHaveConversation')}
                  </div>
                ) : (
                  availableClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {availableClients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {clients.length === 0 ? (
                  <>
                    {t('consultant:messages.needActiveClients')}{" "}
                    <button
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        navigate('/consultant/invitations');
                      }}
                      className="text-primary hover:underline"
                    >
                      {t('consultant:messages.sendInvite')}
                    </button>
                  </>
                ) : (
                  t('consultant:messages.openExistingOrWait')
                )}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={!selectedClientId || createConversationMutation.isPending}
            >
              {createConversationMutation.isPending ? t('consultant:messages.creating') : t('consultant:messages.startConversation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearHistoryDialogOpen} onOpenChange={setClearHistoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('consultant:messages.clearHistoryConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('consultant:messages.clearHistoryConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearHistoryMutation.isPending}>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedConversation && clearHistoryMutation.mutate(selectedConversation)}
              disabled={clearHistoryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearHistoryMutation.isPending ? t('consultant:messages.clearing') : t('consultant:messages.clear')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteChatDialogOpen} onOpenChange={setDeleteChatDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('consultant:messages.deleteConversationConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('consultant:messages.deleteConversationConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConversationMutation.isPending}>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedConversation && deleteConversationMutation.mutate(selectedConversation)}
              disabled={deleteConversationMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConversationMutation.isPending ? t('consultant:messages.deleting') : t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Messages;
