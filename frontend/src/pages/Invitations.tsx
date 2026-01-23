import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, CheckCircle2, XCircle, Mail, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/badge";
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
import { formatDistanceToNow } from "date-fns";
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

const Invitations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customer', 'invitations'],
    queryFn: () => customerApi.getInvitations(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const invitations = data?.invitations || [];
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const hasExpiredInvitations = invitations.some(inv => {
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
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao aceitar convite",
        variant: "destructive",
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
        variant: "destructive",
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
          <div className="space-y-4">
            {pendingInvitations.map((invitation) => {
              const expired = isExpired(invitation.expiresAt);
              const timeRemaining = getTimeRemaining(invitation.expiresAt);

              return (
                <div
                  key={invitation.id}
                  className={`p-4 rounded-lg border ${
                    expired ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'
                  } hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">{invitation.consultantName}</h3>
                        {expired && (
                          <Badge variant="destructive" className="text-xs">
                            Expirado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Mail className="h-3 w-3" />
                        <span>{invitation.consultantEmail}</span>
                      </div>
                      {timeRemaining && !expired && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Expira {timeRemaining}</span>
                        </div>
                      )}
                      {expired && (
                        <div className="text-xs text-destructive mt-1">
                          Este convite expirou e não pode mais ser aceito
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    {!expired ? (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setSelectedInvitation(invitation)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Recusar
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => handleAccept(invitation)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Aceitar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedInvitation(invitation)}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
    </div>
  );
};

export default Invitations;
