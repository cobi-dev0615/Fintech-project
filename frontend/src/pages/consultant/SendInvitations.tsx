import { useState, useEffect } from "react";
import { UserPlus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Invitation {
  id: string;
  email: string;
  name?: string | null;
  status: string;
  sentAt: string;
  expiresAt: string | null;
}

const SendInvitations = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const data = await consultantApi.getInvitations();
      setInvitations(data.invitations);
    } catch (err: any) {
      console.error("Error fetching invitations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um email válido",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      const result = await consultantApi.sendInvitation({ email, name: name || undefined, message: message || undefined });
      setInvitations([{ ...result.invitation, expiresAt: (result.invitation as any).expiresAt || null }, ...invitations]);
      setEmail("");
      setName("");
      setMessage("");
      toast({
        title: "Sucesso",
        description: `Convite enviado para ${email}`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao enviar convite",
        variant: "destructive",
      });
      console.error("Error sending invitation:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Tem certeza que deseja excluir o convite para ${email}?`)) {
      return;
    }

    try {
      setDeleting(invitationId);
      await consultantApi.deleteInvitation(invitationId);
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      toast({
        title: "Sucesso",
        description: "Convite excluído com sucesso",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao excluir convite",
        variant: "destructive",
      });
      console.error("Error deleting invitation:", err);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-500",
      sent: "bg-blue-500/10 text-blue-500",
      accepted: "bg-success/10 text-success",
      expired: "bg-destructive/10 text-destructive",
    };
    const labels = {
      pending: "Pendente",
      sent: "Enviado",
      accepted: "Aceito",
      expired: "Expirado",
    };
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enviar Convites</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Convide clientes para conectar-se com você na plataforma
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Invitation Form */}
        <ChartCard title="Enviar Novo Convite">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email do Cliente *</Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cliente (opcional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem Personalizada (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Olá! Gostaria de convidá-lo para usar a plataforma zurT..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <Button onClick={handleSendInvitation} className="w-full" size="lg" disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Enviando..." : "Enviar Convite por Email"}
            </Button>
          </div>
        </ChartCard>

        {/* Invitations History */}
        <ChartCard title="Histórico de Convites">
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Carregando...</p>
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum convite enviado ainda</p>
              </div>
            ) : (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-foreground mb-1">
                        {invitation.name || invitation.email}
                      </div>
                      <div className="text-sm text-muted-foreground">{invitation.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(invitation.status)}
                      {invitation.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteInvitation(invitation.id, invitation.email)}
                          disabled={deleting === invitation.id}
                          title="Excluir convite"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                    <span>Enviado: {formatDate(invitation.sentAt)}</span>
                    <span>Expira: {formatDate(invitation.expiresAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      {/* Tips */}
      <ChartCard title="Dicas para Convites">
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-1">Personalize sua mensagem</div>
              <p>Uma mensagem personalizada aumenta as chances de aceitação do convite.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-1">Acompanhe o status</div>
              <p>Veja quais convites foram aceitos, pendentes ou expirados no histórico.</p>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
};

export default SendInvitations;

