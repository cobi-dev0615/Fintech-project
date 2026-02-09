import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Trash2, ChevronsUpDown, Loader2, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, Mail, MailPlus, History, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn, getToastVariantForApiError } from "@/lib/utils";
import { useWebSocket } from "@/contexts/WebSocketContext";

interface Invitation {
  id: string;
  email: string;
  name?: string | null;
  status: string;
  sentAt: string;
  expiresAt: string | null;
}

interface AvailableCustomer {
  id: string;
  email: string;
  name: string | null;
}

const SendInvitations = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState<AvailableCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const invitationsPerPage = 5;
  const { toast } = useToast();

  const fetchAvailableCustomers = useCallback(async (search?: string) => {
    try {
      setCustomersLoading(true);
      const res = await consultantApi.getAvailableCustomers(search || undefined);
      setAvailableCustomers(res.customers || []);
    } catch (err) {
      setAvailableCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (emailOpen) {
      const timer = setTimeout(() => {
        fetchAvailableCustomers(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [emailOpen, searchQuery, fetchAvailableCustomers]);

  const handleOpenChange = (open: boolean) => {
    setEmailOpen(open);
    if (!open) setSearchQuery("");
  };

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await consultantApi.getInvitations();
      setInvitations(data.invitations);
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Error fetching invitations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvitationsRef = useRef(fetchInvitations);
  fetchInvitationsRef.current = fetchInvitations;

  useWebSocket((message) => {
    if (message.type === "invitation_accepted" || message.type === "invitation_declined") {
      fetchInvitationsRef.current();
    }
  });

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  useEffect(() => {
    const newTotalPages = Math.max(1, Math.ceil(invitations.length / invitationsPerPage) || 1);
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages);
    }
  }, [invitations.length, currentPage, invitationsPerPage]);

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
        variant: getToastVariantForApiError(err),
      });
      console.error("Error sending invitation:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteInvitation = async () => {
    if (!deleteTarget) return;
    const { id: invitationId, email } = deleteTarget;
    try {
      setDeleting(invitationId);
      await consultantApi.deleteInvitation(invitationId);
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      setDeleteTarget(null);
      toast({
        title: "Sucesso",
        description: "Convite excluído com sucesso",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao excluir convite",
        variant: getToastVariantForApiError(err),
      });
      console.error("Error deleting invitation:", err);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusConfig = (status: string) => {
    const config = {
      pending: { icon: Clock, label: "Pendente", className: "bg-yellow-500/10 text-yellow-500" },
      sent: { icon: Mail, label: "Enviado", className: "bg-blue-500/10 text-blue-500" },
      accepted: { icon: CheckCircle2, label: "Aceito", className: "bg-success/10 text-success" },
      expired: { icon: XCircle, label: "Expirado", className: "bg-destructive/10 text-destructive" },
    };
    return config[status as keyof typeof config] ?? config.pending;
  };

  const getStatusBadge = (status: string) => {
    const { icon: Icon, label, className } = getStatusConfig(status);
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)} title={label}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <Badge className={cn("hidden md:inline-flex", className)}>
          {label}
        </Badge>
      </span>
    );
  };

  const totalInvitations = invitations.length;
  const totalPages = Math.max(1, Math.ceil(totalInvitations / invitationsPerPage) || 1);
  const startIndex = (currentPage - 1) * invitationsPerPage;
  const paginatedInvitations = invitations.slice(startIndex, startIndex + invitationsPerPage);
  const showingFrom = totalInvitations === 0 ? 0 : Math.min(startIndex + 1, totalInvitations);
  const showingTo =
    totalInvitations === 0 ? 0 : Math.min(startIndex + paginatedInvitations.length, totalInvitations);

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
    <div className="space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Enviar Convites</h1>
          <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Convide clientes para conectar-se com você na plataforma zurT
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Invitation Form */}
        <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MailPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Enviar Novo Convite</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Preencha o email e opcionalmente personalize a mensagem</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email do Cliente *</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 min-w-0"
                />
                <Popover open={emailOpen} onOpenChange={handleOpenChange}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" type="button" aria-label="Buscar cliente" title="Buscar cliente na lista">
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(100vw-2rem,320px)] p-0" align="end">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar por nome ou email..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {customersLoading ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            "Nenhum cliente disponível. Digite o email ao lado."
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableCustomers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.email} ${customer.name || ""}`}
                              onSelect={() => {
                                setEmail(customer.email);
                                setName(customer.name || "");
                                setEmailOpen(false);
                              }}
                            >
                              <div className="flex flex-1 min-w-0 truncate">
                                <span className="font-medium truncate">{customer.email}</span>
                                {customer.name && (
                                  <span className="ml-2 text-xs text-muted-foreground truncate hidden sm:inline">
                                    {customer.name}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-xs text-muted-foreground">
                Digite o email ou use o ícone ao lado para buscar clientes já registrados.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cliente (opcional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Preenchido ao selecionar um cliente da lista"
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
                className="min-h-[100px] resize-none"
              />
            </div>

            <Button onClick={handleSendInvitation} className="w-full" size="lg" disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {sending ? "Enviando..." : "Enviar Convite por Email"}
            </Button>
          </div>
        </div>

        {/* Invitations History */}
        <div className="rounded-xl border-2 border-violet-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-violet-500/5 transition-shadow min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Histórico de Convites</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Acompanhe o status dos convites enviados</p>
            </div>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-muted/20">
                <Mail className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">Nenhum convite enviado ainda</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">Envie um convite pelo formulário ao lado para começar.</p>
              </div>
            ) : (
              paginatedInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{invitation.name || invitation.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{invitation.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(invitation.status)}
                      {invitation.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ id: invitation.id, email: invitation.email })}
                          disabled={deleting === invitation.id}
                          title="Excluir convite"
                          aria-label="Excluir convite"
                        >
                          {deleting === invitation.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-3 border-t border-border">
                    <span>Enviado: {formatDate(invitation.sentAt)}</span>
                    <span>Expira: {formatDate(invitation.expiresAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalInvitations > 0 && (
            <div className="flex flex-col gap-3 pt-4 mt-4 border-t border-border text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="tabular-nums">
                Mostrando {showingFrom}-{showingTo} de {totalInvitations} convites
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-foreground font-medium tabular-nums min-w-[4ch] text-center">{currentPage} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages || totalInvitations === 0}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-xl border-2 border-amber-500/50 bg-card p-5 shadow-sm min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Lightbulb className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Dicas para Convites</h2>
        </div>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
            <div>
              <p className="font-semibold text-foreground mb-0.5">Personalize sua mensagem</p>
              <p>Uma mensagem personalizada aumenta as chances de aceitação do convite.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
            <div>
              <p className="font-semibold text-foreground mb-0.5">Acompanhe o status</p>
              <p>Veja no histórico quais convites foram aceitos, pendentes ou expirados.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir convite?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o convite para{" "}
              <strong>{deleteTarget?.email}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvitation}
              disabled={!!deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SendInvitations;

