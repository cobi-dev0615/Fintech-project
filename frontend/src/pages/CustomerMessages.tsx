import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Send, Search, MoreVertical, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChartCard from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { customerApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

const CustomerMessages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [deleteChatDialogOpen, setDeleteChatDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['customer', 'conversations'],
    queryFn: () => customerApi.getConversations(),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 30000,
    enabled: !!user,
  });

  const conversations = conversationsData?.conversations || [];

  // Real-time: subscribe to new messages and conversation updates
  useWebSocket((message) => {
    if (message.type === 'new_message') {
      queryClient.invalidateQueries({ queryKey: ['customer', 'conversations'] });
      if (message.conversationId === selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ['customer', 'conversation', selectedConversation] });
      }
    } else if (message.type === 'conversation_cleared' && message.conversationId === selectedConversation) {
      queryClient.invalidateQueries({ queryKey: ['customer', 'conversation', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['customer', 'conversations'] });
    } else if (message.type === 'conversation_deleted') {
      queryClient.invalidateQueries({ queryKey: ['customer', 'conversations'] });
      if (message.conversationId === selectedConversation) {
        setSelectedConversation(null);
      }
    }
  });

  const filteredConversations = conversations.filter((conv) =>
    conv.consultantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ['customer', 'conversation', selectedConversation],
    queryFn: () => customerApi.getConversation(selectedConversation!),
    enabled: !!user && !!selectedConversation,
    staleTime: 10 * 1000,
    gcTime: 1 * 60 * 1000,
    refetchInterval: 15000,
  });

  const currentConversation = conversationData ? {
    id: conversationData.conversation.id,
    consultantId: conversationData.conversation.consultantId,
    consultantName: conversationData.conversation.consultantName,
    messages: conversationData.messages || [],
  } : null;

  useEffect(() => {
    if (messagesEndRef.current && currentConversation?.messages) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentConversation?.messages]);

  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      customerApi.sendMessage(conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'conversation', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['customer', 'conversations'] });
      setNewMessage("");
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
    mutationFn: (conversationId: string) => customerApi.clearHistory(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'conversation', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['customer', 'conversations'] });
      setClearHistoryDialogOpen(false);
      toast({ title: "Histórico limpo", description: "Todas as mensagens foram removidas.", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.error || "Erro ao limpar histórico", variant: "destructive" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => customerApi.deleteConversation(conversationId),
    onSuccess: () => {
      setSelectedConversation(null);
      queryClient.invalidateQueries({ queryKey: ['customer', 'conversations'] });
      setDeleteChatDialogOpen(false);
      toast({ title: "Conversa excluída", description: "A conversa foi removida.", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err?.error || "Erro ao excluir conversa", variant: "destructive" });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: newMessage,
    });
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mensagens</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comunique-se com seus consultores
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/invitations')}>
          Ver Convites
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        <ChartCard className="p-0 flex flex-col">
          <div className="p-4 border-b border-border">
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
          <ScrollArea className="flex-1">
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
                    <p className="text-xs mt-2">
                      Seus consultores podem iniciar conversas com você. Aceite um convite para começar.
                    </p>
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
                              {conversation.consultantName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground truncate">
                              {conversation.consultantName}
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

        <div className="lg:col-span-2">
          <ChartCard className="h-full flex flex-col p-0">
            {conversationLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Skeleton className="h-32 w-full" />
              </div>
            ) : currentConversation ? (
              <>
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {currentConversation?.consultantName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {currentConversation?.consultantName}
                      </div>
                      <div className="text-xs text-muted-foreground">Consultor</div>
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

                <ScrollArea className="flex-1 p-4 pb-0" ref={scrollAreaRef}>
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
                            message.sender === "client" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.sender === "client"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.sender === "client"
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
                </ScrollArea>

                <div className="fixed lg:sticky bottom-0 left-0 right-0 lg:left-auto lg:right-auto z-10 bg-card border-t border-border p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.15)]">
                  <div className="flex gap-2">
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
                      disabled={sendMessageMutation.isLoading}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      size="icon" 
                      className="flex-shrink-0" 
                      disabled={sendMessageMutation.isLoading || !newMessage.trim()}
                    >
                      {sendMessageMutation.isLoading ? (
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
                  <p className="text-sm text-muted-foreground">
                    Seus consultores podem iniciar conversas com você. Aceite um convite em{" "}
                    <button
                      onClick={() => navigate('/app/invitations')}
                      className="text-primary hover:underline"
                    >
                      Convites
                    </button>{" "}
                    para começar.
                  </p>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

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

export default CustomerMessages;
