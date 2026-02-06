import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Send, Search, UserPlus, Calendar, Plus, MoreVertical, Trash2, History, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChartCard from "@/components/dashboard/ChartCard";
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
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
        title: "Conversa criada",
        description: `Conversa iniciada com ${data.conversation.clientName}`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao criar conversa",
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
        title: "Erro",
        description: err?.error || "Erro ao enviar mensagem",
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
      toast({ title: "Histórico limpo", description: "Todas as mensagens foram removidas.", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.error || "Erro ao limpar histórico", variant: "destructive" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => consultantApi.deleteConversation(conversationId),
    onSuccess: () => {
      setSelectedConversation(null);
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversations'] });
      setDeleteChatDialogOpen(false);
      toast({ title: "Conversa excluída", description: "A conversa foi removida.", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.error || "Erro ao excluir conversa", variant: "destructive" });
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
      toast({ title: "Tipo não permitido", description: "Use: pdf, doc, docx, xls, xlsx, jpg, png, gif, txt, csv", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo grande", description: "Máximo 10MB", variant: "destructive" });
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
      toast({ title: "Erro", description: err?.error || "Falha ao enviar arquivo", variant: "destructive" });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleCreateConversation = () => {
    if (!selectedClientId) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um cliente",
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
        return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
      } else if (diffInHours < 48) {
        return `Ontem ${format(date, 'HH:mm', { locale: ptBR })}`;
      } else {
        return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
      }
    } catch {
      return timestamp;
    }
  };

  const formatConversationTime = (timestamp: string) => {
    try {
      if (timestamp === 'Nunca') return 'Nunca';
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        return 'Agora';
      } else if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
      } else {
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
      }
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Page Header */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mensagens</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comunique-se com seus clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/consultant/invitations')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Enviar Convite
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conversa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Conversations List */}
        <ChartCard className="p-0 flex flex-col min-h-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-1 p-2">
              {conversationsLoading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa encontrada"}
                  {!searchQuery && conversations.length === 0 && (
                    <p className="text-xs mt-2">Comece uma nova conversa com um cliente</p>
                  )}
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConversation === conversation.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {conversation.clientName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground truncate">
                              {conversation.clientName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {conversation.lastMessage}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatConversationTime(conversation.timestamp)}
                        </span>
                        {conversation.unread > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-xs min-w-[20px] justify-center">
                            {conversation.unread > 99 ? '99+' : conversation.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </ChartCard>

        {/* Chat dialog: fixed height; scrollbar only in conversation history */}
        <div className="lg:col-span-2 min-h-0 flex flex-col ">
          <ChartCard className="h-full min-h-0 flex flex-col p-0 ">
            {conversationLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Skeleton className="h-32 w-full" />
              </div>
            ) : currentConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {currentConversation?.clientName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {currentConversation?.clientName}
                      </div>
                      <div className="text-xs text-muted-foreground">Cliente</div>
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
                          Limpar histórico
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteChatDialogOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir conversa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Chat area: only this part scrolls (not header, not input block) */}
                <div
                  className="flex-1 min-h-0 max-h-[min(70vh,calc(100vh-14rem))] overflow-y-auto overflow-x-hidden overscroll-contain p-4 pb-0"
                  ref={scrollAreaRef}
                  style={{ overscrollBehavior: 'contain' }}
                >
                  <div className="space-y-4 pb-24">
                    {currentConversation?.messages?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma mensagem ainda</p>
                        <p className="text-xs mt-1">Envie a primeira mensagem para começar a conversa</p>
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
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.sender === "consultant"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {message.content ? <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p> : null}
                            {message.attachmentUrl && message.attachmentName && (
                              <a href={getApiBaseUrl().replace(/\/api\/?$/, "") + message.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline flex items-center gap-1 mt-1">
                                <Paperclip className="h-3 w-3 flex-shrink-0" />
                                {message.attachmentName}
                              </a>
                            )}
                            <p
                              className={`text-xs mt-1 ${
                                message.sender === "consultant"
                                  ? "text-amber-200/95"
                                  : "text-cyan-400 dark:text-cyan-400"
                              }`}
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
                <div className="flex-shrink-0 bg-card border-t border-border p-4">
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
                      aria-label="Anexar arquivo"
                    >
                      {uploadingFile ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                    <Textarea
                      placeholder="Digite sua mensagem..."
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
                <div>
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-2">
                    Selecione uma conversa para começar a trocar mensagens
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Iniciar Nova Conversa
                  </Button>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Create Conversation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="gap-6 sm:max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>
              Selecione um cliente para iniciar uma conversa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {availableClients.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {clients.length === 0
                      ? "Nenhum cliente ativo encontrado"
                      : "Todos os seus clientes já possuem conversa ativa"}
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
                    Você precisa ter clientes ativos para iniciar conversas.{" "}
                    <button
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        navigate('/consultant/invitations');
                      }}
                      className="text-primary hover:underline"
                    >
                      Envie um convite
                    </button>
                  </>
                ) : (
                  "Abra uma conversa existente na lista ao lado ou aguarde novos clientes."
                )}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateConversation}
              disabled={!selectedClientId || createConversationMutation.isPending}
            >
              {createConversationMutation.isPending ? "Criando..." : "Iniciar Conversa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearHistoryDialogOpen} onOpenChange={setClearHistoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as mensagens desta conversa serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearHistoryMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedConversation && clearHistoryMutation.mutate(selectedConversation)}
              disabled={clearHistoryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearHistoryMutation.isPending ? "Limpando..." : "Limpar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteChatDialogOpen} onOpenChange={setDeleteChatDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa inteira será excluída permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConversationMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedConversation && deleteConversationMutation.mutate(selectedConversation)}
              disabled={deleteConversationMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConversationMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Messages;
