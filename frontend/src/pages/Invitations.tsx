import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { getToastVariantForApiError } from "@/lib/utils";
import { UserPlus, CheckCircle2, XCircle, Mail, Clock, AlertCircle, Copy, Users, Percent, Wallet, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChartCard from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { customerApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invitation {
  id: string;
  consultantId: string;
  consultantName: string;
  consultantEmail: string;
  status: string;
  sentAt: string;
  expiresAt: string | null;
}

interface InvitedUser {
  id: string;
  name: string;
  email: string;
  status: string;
  registeredAt: string;
}

const Invitations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [consultantToDisconnect, setConsultantToDisconnect] = useState<{ id: string; name: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [togglingShare, setTogglingShare] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string>("");
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [referralLoading, setReferralLoading] = useState(true);

  useEffect(() => {
    const loadReferral = async () => {
      try {
        setReferralLoading(true);
        const [linkRes, usersRes] = await Promise.all([
          customerApi.getReferralLink().catch(() => ({ link: "" })),
          customerApi.getInvitedUsers().catch(() => ({ invitedUsers: [], invitedCount: 0 })),
        ]);
        setReferralLink(linkRes.link || "");
        setInvitedUsers(usersRes.invitedUsers || []);
      } catch {
        setReferralLink("");
        setInvitedUsers([]);
      } finally {
        setReferralLoading(false);
      }
    };
    loadReferral();
  }, []);

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Link copiado!", description: "O link de convite foi copiado para a área de transferência.", variant: "success" });
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customer', 'invitations'],
    queryFn: () => customerApi.getInvitations(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: consultantsData } = useQuery({
    queryKey: ['customer', 'consultants'],
    queryFn: () => customerApi.getConsultants(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const invitations = data?.invitations || [];
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const acceptedConsultants = consultantsData?.consultants || [];
  const hasConsultantWhoInvitedMe = pendingInvitations.length > 0 || acceptedConsultants.length > 0;
  const hasExpiredInvitations = invitations.some(inv => {

  useWebSocket((message) => {
    if (message.type === "consultant_invitation") {
      queryClient.invalidateQueries({ queryKey: ["customer", "invitations"] });
    }
  });
    if (!inv.expiresAt) return false;
    return new Date(inv.expiresAt) < new Date();
  });

  const handleAccept = async (invitation: Invitation) => {
    try {
      await customerApi.acceptInvitation(invitation.id);
      queryClient.invalidateQueries({ queryKey: ['customer', 'invitations'] });
      queryClient.invalidateQueries({ queryKey: ['customer', 'consultants'] });
      toast({
        title: "Convite aceito",
        description: `Você agora está conectado com ${invitation.consultantName}`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao aceitar convite",
        variant: getToastVariantForApiError(err),
      });
    }
  };

  const handleDecline = async () => {
    if (!selectedInvitation) return;

    try {
      await customerApi.declineInvitation(selectedInvitation.id);
      queryClient.invalidateQueries({ queryKey: ['customer', 'invitations'] });
      setDeclineDialogOpen(false);
      setSelectedInvitation(null);
      toast({
        title: "Convite recusado",
        description: "O convite foi removido",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao recusar convite",
        variant: getToastVariantForApiError(err),
      });
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt);
    const now = new Date();
    if (expires < now) return null;
    return formatDistanceToNow(expires, { addSuffix: true, locale: ptBR });
  };

  const handleDisconnect = async () => {
    if (!consultantToDisconnect) return;
    try {
      setDisconnecting(true);
      await customerApi.disconnectConsultant(consultantToDisconnect.id);
      queryClient.invalidateQueries({ queryKey: ['customer', 'consultants'] });
      queryClient.invalidateQueries({ queryKey: ['customer', 'invitations'] });
      setDisconnectDialogOpen(false);
      setConsultantToDisconnect(null);
      toast({ title: "Desconectado", description: "Você foi desconectado do consultor.", variant: "success" });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.error || "Erro ao desconectar", variant: getToastVariantForApiError(err) });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleWalletShare = async (linkId: string, currentValue: boolean) => {
    try {
      setTogglingShare(linkId);
      await customerApi.updateConsultantWalletShare(linkId, !currentValue);
      queryClient.invalidateQueries({ queryKey: ['customer', 'consultants'] });
      toast({
        title: !currentValue ? "Carteira compartilhada" : "Compartilhamento desativado",
        description: !currentValue ? "O consultor pode ver suas informações de carteira." : "O consultor não pode mais ver suas informações de carteira.",
        variant: "success",
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.error || "Erro ao atualizar permissão", variant: getToastVariantForApiError(err) });
    } finally {
      setTogglingShare(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Convites de Consultores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus convites de consultores financeiros
          </p>
        </div>
      </div>

      {/* Consultant(s) who invited me */}
      <ChartCard
        title="Consultor(es) que te convidaram"
        subtitle={hasConsultantWhoInvitedMe ? undefined : "Nenhum consultor te convidou ainda"}
      >
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !hasConsultantWhoInvitedMe ? (
          <p className="text-sm text-muted-foreground py-2">
            Quando um consultor financeiro enviar um convite para você, ele aparecerá aqui.
          </p>
        ) : (
          <ul className="space-y-3">
            {pendingInvitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{inv.consultantName}</span>
                    <span className="text-muted-foreground text-sm ml-2">{inv.consultantEmail}</span>
                  </div>
                </div>
                <Badge variant="secondary">Aguardando sua resposta</Badge>
              </li>
            ))}
            {acceptedConsultants.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-muted/10">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">{c.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Label htmlFor={`share-${c.id}`} className="text-sm whitespace-nowrap cursor-pointer">
                      Compartilhar carteira
                    </Label>
                    <Switch
                      id={`share-${c.id}`}
                      checked={c.canViewAll !== false}
                      disabled={togglingShare === c.id}
                      onCheckedChange={() => handleToggleWalletShare(c.id, c.canViewAll !== false)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => { setConsultantToDisconnect({ id: c.id, name: c.name }); setDisconnectDialogOpen(true); }}
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    Desconectar
                  </Button>
                  <Badge>Conectado</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>

      {/* Convidar amigos (referral) */}
      <ChartCard
        title="Convidar amigos"
        subtitle="Compartilhe seu link e ganhe 20% de desconto na assinatura mensal ao convidar 10+ pessoas"
      >
        {referralLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input readOnly value={referralLink} className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={copyReferralLink} disabled={!referralLink} title="Copiar link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {invitedUsers.length >= 10 && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-3 py-2 text-sm">
                <Percent className="h-4 w-4" />
                <span>Você tem direito a 20% de desconto na assinatura mensal!</span>
              </div>
            )}
            {invitedUsers.length < 10 && invitedUsers.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Convidou <strong>{invitedUsers.length}</strong> pessoa(s). Convide mais <strong>{10 - invitedUsers.length}</strong> para ganhar 20% de desconto.
              </p>
            )}
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" /> Pessoas que você convidou ({invitedUsers.length})
              </h4>
              {invitedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 border rounded-lg bg-muted/30 text-center">
                  Nenhuma pessoa convidada ainda. Compartilhe seu link acima para convidar clientes para a plataforma.
                </p>
              ) : (
                <ul className="border rounded-lg divide-y text-sm">
                  {invitedUsers.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <span className="font-medium">{u.name}</span>
                        <span className="text-muted-foreground ml-2">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={u.status === "registered" ? "default" : "secondary"}>
                          {u.status === "registered" ? "Cadastrado" : u.status === "pending_approval" ? "Aguardando aprovação" : "Inativo"}
                        </Badge>
                        <span className="text-muted-foreground text-xs">{format(new Date(u.registeredAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </ChartCard>

      {/* Alerts */}
      {hasExpiredInvitations && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você tem convites expirados. Eles serão removidos automaticamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Invitations */}
      <ChartCard 
        title="Convites Pendentes" 
        subtitle={pendingInvitations.length > 0 ? `${pendingInvitations.length} convite(s) aguardando resposta` : undefined}
      >
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">{(error as any)?.error || "Erro ao carregar convites"}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : pendingInvitations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum convite pendente</p>
            <p className="text-sm mt-2">Quando um consultor enviar um convite, ele aparecerá aqui</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Consultor</TableHead>
                <TableHead className="text-left">E-mail</TableHead>
                <TableHead className="text-left">Enviado em</TableHead>
                <TableHead className="text-left">Status / Expira</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvitations.map((invitation) => {
                const expired = isExpired(invitation.expiresAt);
                const timeRemaining = getTimeRemaining(invitation.expiresAt);
                return (
                  <TableRow
                    key={invitation.id}
                    className={expired ? "bg-destructive/5" : undefined}
                  >
                    <TableCell className="font-medium">{invitation.consultantName}</TableCell>
                    <TableCell className="text-muted-foreground">{invitation.consultantEmail}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {format(new Date(invitation.sentAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {expired ? (
                        <Badge variant="destructive" className="text-xs">Expirado</Badge>
                      ) : timeRemaining ? (
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expira {timeRemaining}
                        </span>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!expired ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInvitation(invitation)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Recusar
                          </Button>
                          <Button size="sm" onClick={() => handleAccept(invitation)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aceitar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvitation(invitation)}
                        >
                          Remover
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ChartCard>

      {/* Information Card */}
      <ChartCard title="Sobre Convites">
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-foreground mb-1">O que são convites?</div>
              <p>
                Consultores financeiros podem convidá-lo para conectar-se na plataforma. 
                Ao aceitar, eles terão acesso aos seus dados financeiros para fornecer orientação personalizada.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-foreground mb-1">Validade</div>
              <p>
                Os convites expiram após 30 dias. Certifique-se de responder antes do prazo.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-foreground mb-1">Privacidade</div>
              <p>
                Você pode revogar o acesso de um consultor a qualquer momento nas configurações.
              </p>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Decline Confirmation Dialog */}
      <AlertDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja recusar o convite de{" "}
              <strong>{selectedInvitation?.consultantName}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedInvitation(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Recusar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disconnect Consultant Confirmation Dialog */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar do consultor?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desconectar de <strong>{consultantToDisconnect?.name}</strong>?
              O consultor não poderá mais acessar suas informações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConsultantToDisconnect(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnecting ? "Desconectando..." : "Desconectar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Invitations;
