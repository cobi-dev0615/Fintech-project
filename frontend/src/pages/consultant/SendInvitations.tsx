import { useState, useEffect } from "react";
import { UserPlus, Mail, Copy, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Invitation {
  id: string;
  email: string;
  name?: string | null;
  status: "pending" | "sent" | "accepted" | "expired";
  sentAt: string;
  expiresAt: string | null;
}

const SendInvitations = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [invitationMethod, setInvitationMethod] = useState<"email" | "link">("email");
  const [copiedLink, setCopiedLink] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
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

    fetchInvitations();
  }, []);

  const invitationLink = `${window.location.origin}/invite/consultant-abc123xyz`;

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
      setInvitations([result.invitation, ...invitations]);
      setEmail("");
      setName("");
      setMessage("");
      toast({
        title: "Sucesso",
        description: `Convite enviado para ${email}`,
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
              <Label htmlFor="method">Método de Convite</Label>
              <Select
                value={invitationMethod}
                onValueChange={(v: any) => setInvitationMethod(v)}
              >
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Por Email</SelectItem>
                  <SelectItem value="link">Link de Convite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {invitationMethod === "email" ? (
              <>
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
              </>
            ) : (
              <>
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Compartilhe este link de convite com seus clientes. Eles poderão se registrar
                    e conectar-se automaticamente com você.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Link de Convite</Label>
                  <div className="flex gap-2">
                    <Input value={invitationLink} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                      className="flex-shrink-0"
                    >
                      {copiedLink ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.location.href = `mailto:?subject=Convite zurT&body=Olá! Gostaria de convidá-lo para usar a plataforma zurT. Clique no link para se registrar: ${invitationLink}`;
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Abrir Cliente de Email
                </Button>
              </>
            )}
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
                    {getStatusBadge(invitation.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                    <span>Enviado: {invitation.sentAt}</span>
                    <span>Expira: {invitation.expiresAt}</span>
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
              <div className="font-semibold text-foreground mb-1">Link de convite</div>
              <p>Você pode compartilhar o link de convite diretamente ou enviar por email.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
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

