import { useState, useEffect } from "react";
import { MessageSquare, Send, Search, UserPlus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChartCard from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { consultantApi } from "@/lib/api";

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
  const [conversations, setConversations] = useState<Message[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const data = await consultantApi.getConversations();
        setConversations(data.conversations);
      } catch (err: any) {
        console.error("Error fetching conversations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversation) {
      setCurrentConversation(null);
      return;
    }

    const fetchConversation = async () => {
      try {
        const data = await consultantApi.getConversation(selectedConversation);
        setCurrentConversation({
          id: data.conversation.id,
          clientId: data.conversation.clientId,
          clientName: data.conversation.clientName,
          messages: data.messages,
        });
      } catch (err: any) {
        console.error("Error fetching conversation:", err);
      }
    };

    fetchConversation();
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const result = await consultantApi.sendMessage(selectedConversation, newMessage);
      setCurrentConversation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, result.message],
        };
      });
      setNewMessage("");
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert(err?.error || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
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
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Carregando...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma conversa ainda</p>
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
                        {currentConversation.clientName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {currentConversation.clientName}
                      </div>
                      <div className="text-xs text-muted-foreground">Cliente</div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {currentConversation.messages.map((message) => (
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
                    <Button onClick={handleSendMessage} size="icon" className="flex-shrink-0" disabled={sending || !newMessage.trim()}>
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

