import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Search, UserPlus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChartCard from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  clientId: string;
  clientName: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface Conversation {
  id: string;
  clientId: string;
  clientName: string;
  messages: {
    id: string;
    sender: "client" | "consultant";
    content: string;
    timestamp: string;
  }[];
}

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['consultant', 'conversations'],
    queryFn: () => consultantApi.getConversations(),
    staleTime: 30 * 1000, // 30 seconds (messages change frequently)
    gcTime: 2 * 60 * 1000, // 2 minutes (formerly cacheTime)
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const conversations = conversationsData?.conversations || [];

  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ['consultant', 'conversation', selectedConversation],
    queryFn: () => consultantApi.getConversation(selectedConversation!),
    enabled: !!selectedConversation,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 1 * 60 * 1000, // 1 minute (formerly cacheTime)
  });

  const currentConversation = conversationData ? {
    id: conversationData.conversation.id,
    clientId: conversationData.conversation.clientId,
    clientName: conversationData.conversation.clientName,
    messages: conversationData.messages || [],
  } : null;

  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      consultantApi.sendMessage(conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversation', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'conversations'] });
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

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: newMessage,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mensagens</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comunique-se com seus clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Enviar Convite
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Agendar Reunião
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <ChartCard className="p-0 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-9"
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
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma conversa encontrada
                </div>
              ) : (
                conversations.map((conversation) => (
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
                              {conversation.clientName.charAt(0)}
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
                          {conversation.timestamp}
                        </span>
                        {conversation.unread > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            {conversation.unread}
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

        {/* Chat Area */}
        <div className="lg:col-span-2">
          <ChartCard className="h-full flex flex-col p-0">
            {currentConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {currentConversation?.clientName?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {currentConversation?.clientName}
                      </div>
                      <div className="text-xs text-muted-foreground">Cliente</div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {currentConversation?.messages?.map((message: any) => (
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
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
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
                    />
                    <Button onClick={handleSendMessage} size="icon" className="flex-shrink-0" disabled={sendMessageMutation.isLoading || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Selecione uma conversa para começar a trocar mensagens
                  </p>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default Messages;

