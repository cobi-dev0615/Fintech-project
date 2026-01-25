import { useState, useEffect } from "react";
import { 
  User, 
  Bell, 
  Save, 
  Lock, 
  ChevronRight,
  History,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Loader2,
  Trash2,
  Eye,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Switch } from "@/components/ui/switch";
import { userApi, authApi, subscriptionsApi, commentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ProfileState {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  birthDate: string;
  riskProfile: string;
}

const Settings = () => {
  const [activeStep, setActiveStep] = useState<string>("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // State for different sections
  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    email: "",
    phone: "+55 ",
    countryCode: "BR",
    birthDate: "",
    riskProfile: "",
  });

  const formatPhone = (value: string) => {
    // Keep only digits
    const digits = value.replace(/\D/g, "");
    
    // Always ensure it starts with 55
    let formatted = digits;
    if (!formatted.startsWith("55")) {
      formatted = "55" + formatted;
    }

    // Limit to 13 digits (55 + 11)
    formatted = formatted.slice(0, 13);

    // Apply mask: +55 (XX) XXXXX-XXXX
    if (formatted.length <= 2) return `+${formatted}`;
    if (formatted.length <= 4) return `+${formatted.slice(0, 2)} (${formatted.slice(2)}`;
    if (formatted.length <= 9) return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4)}`;
    return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4, 9)}-${formatted.slice(9)}`;
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 12 && digits.length <= 13;
  };

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    transactionAlerts: true,
    goalReminders: true,
    weeklySummary: true,
    marketingEmails: false,
  });

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordError, setPasswordError] = useState("");

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, totalPages: 1 });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentsPagination, setCommentsPagination] = useState({ page: 1, totalPages: 1 });
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [newComment, setNewComment] = useState({ title: "", content: "" });

  const steps = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "password", label: "Senha", icon: Lock },
    { id: "history", label: "Histórico de Planos", icon: History },
    { id: "assets", label: "Ativos", icon: LayoutDashboard },
    { id: "comments", label: "Comentários", icon: MessageSquare },
  ];

  // Load user data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await authApi.me();
        const user = response.user;
        const savedCountryCode = localStorage.getItem("userCountryCode") || "BR";
        setProfile({
          name: user.full_name || "",
          email: user.email || "",
          phone: user.phone ? formatPhone(user.phone) : "+55 ",
          countryCode: savedCountryCode,
          birthDate: user.birth_date || "",
          riskProfile: user.risk_profile || "",
        });
      } catch (error: any) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Fetch History
  useEffect(() => {
    if (activeStep === "history") {
      fetchHistory(1);
    }
  }, [activeStep]);

  // Fetch Comments
  useEffect(() => {
    if (activeStep === "comments") {
      fetchComments(1);
    }
  }, [activeStep]);

  const fetchHistory = async (page: number) => {
    setHistoryLoading(true);
    try {
      const response = await subscriptionsApi.getHistory(page);
      setHistory(response.history);
      setHistoryPagination({
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchComments = async (page: number) => {
    setCommentsLoading(true);
    try {
      const response = await commentsApi.getAll(page);
      setComments(response.comments);
      setCommentsPagination({
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profile.phone && !validatePhone(profile.phone)) {
      toast({ title: "Erro", description: "Por favor, insira um telefone brasileiro válido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await userApi.updateProfile({
        full_name: profile.name,
        phone: profile.phone ? profile.phone.replace(/\D/g, "") : undefined,
        birth_date: profile.birthDate || undefined,
        risk_profile: profile.riskProfile || undefined,
      });
      localStorage.setItem("userCountryCode", profile.countryCode);
      toast({ title: "Sucesso", description: "Perfil atualizado com sucesso" });
    } catch (error: any) {
      toast({ title: "Erro", description: error?.error || "Erro ao atualizar perfil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      localStorage.setItem("userNotifications", JSON.stringify(notifications));
      toast({ title: "Sucesso", description: "Notificações atualizadas" });
    } catch (error: any) {
      toast({ title: "Erro", description: "Erro ao atualizar notificações", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!password.currentPassword || !password.newPassword) {
      setPasswordError("Preencha todos os campos");
      return;
    }
    if (password.newPassword !== password.confirmPassword) {
      setPasswordError("As senhas não coincidem");
      return;
    }
    setSaving(true);
    try {
      await userApi.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      toast({ title: "Sucesso", description: "Senha alterada com sucesso" });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      setPasswordError(error?.error || "Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.content.trim()) return;
    setSaving(true);
    try {
      await commentsApi.create(newComment);
      toast({ title: "Sucesso", description: "Comentário enviado ao administrador" });
      setNewComment({ title: "", content: "" });
      setIsCreateModalOpen(false);
      fetchComments(1);
    } catch (error: any) {
      toast({ title: "Erro", description: "Erro ao enviar comentário", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este comentário?")) return;
    try {
      await commentsApi.delete(id);
      toast({ title: "Sucesso", description: "Comentário excluído" });
      fetchComments(commentsPagination.page);
    } catch (error: any) {
      toast({ title: "Erro", description: "Erro ao excluir comentário", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas preferências e informações pessoais</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Vertical Step Bar (Skewer Style) */}
        <div className="w-full lg:w-64 relative h-fit">
          {/* Vertical Skewer Line */}
          <div className="absolute left-6 top-6 bottom-6 w-px bg-border hidden lg:block z-0" />
          
          <div className="flex flex-col gap-6 relative z-10">
            {steps.map((step, index) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className="flex items-center group relative w-full text-left"
                >
                  {/* Step Circle */}
                  <div className={cn(
                    "flex items-center justify-center h-12 w-12 rounded-full border-2 transition-all duration-200 shrink-0 bg-[#020817] z-20",
                    isActive 
                      ? "border-success text-success shadow-[0_0_15px_rgba(34,197,94,0.2)]" 
                      : "border-border text-muted-foreground group-hover:border-success/50"
                  )}>
                    <step.icon className="h-5 w-5" />
                  </div>

                  {/* Step Info */}
                  <div className="ml-4 flex flex-col">
                    <span className={cn(
                      "font-semibold text-sm transition-colors duration-200 uppercase tracking-tight",
                      isActive ? "text-success" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {step.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                      Passo {index + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeStep === "profile" && (
            <ChartCard 
              title="Informações Pessoais"
              actions={<Button onClick={handleSaveProfile} disabled={saving} size="sm"><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar Perfil"}</Button>}
            >
              <div className="space-y-4">
                <div className="space-y-2"><Label htmlFor="name">Nome Completo</Label><Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" value={profile.email} disabled className="bg-muted" /></div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input 
                    id="phone" 
                    value={profile.phone} 
                    onChange={(e) => setProfile({ ...profile, phone: formatPhone(e.target.value) })} 
                    placeholder="+55 (XX) XXXXX-XXXX"
                    className="flex-1" 
                  />
                </div>
                <div className="space-y-2"><Label htmlFor="birthDate">Data de Nascimento</Label><Input id="birthDate" type="date" value={profile.birthDate} onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="riskProfile">Perfil de Risco</Label><Input id="riskProfile" value={profile.riskProfile} onChange={(e) => setProfile({ ...profile, riskProfile: e.target.value })} /></div>
              </div>
            </ChartCard>
          )}

          {activeStep === "notifications" && (
            <ChartCard 
              title="Preferências de Notificação"
              actions={<Button onClick={handleSaveNotifications} disabled={saving} size="sm"><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar Notificações"}</Button>}
            >
              <div className="space-y-8 py-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm font-medium text-foreground/80">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Label>
                    <Switch 
                      id={key} 
                      checked={value} 
                      onCheckedChange={(checked) => setNotifications({ ...notifications, [key]: checked })}
                      className="data-[state=checked]:bg-success"
                    />
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {activeStep === "password" && (
            <ChartCard 
              title="Alterar Senha"
              actions={<Button onClick={handleChangePassword} disabled={saving} size="sm"><Lock className="h-4 w-4 mr-2" />{saving ? "Alterando..." : "Alterar Senha"}</Button>}
            >
              <div className="space-y-4">
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                <div className="space-y-2"><Label htmlFor="currentPassword">Senha Atual</Label><Input id="currentPassword" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="newPassword">Nova Senha</Label><Input id="newPassword" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="confirmPassword">Confirmar Nova Senha</Label><Input id="confirmPassword" type="password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} /></div>
              </div>
            </ChartCard>
          )}

          {activeStep === "history" && (
            <ChartCard title="Histórico de Compras">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plano</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell></TableRow>
                    ) : history.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma compra encontrada</TableCell></TableRow>
                    ) : (
                      history.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.planName}</TableCell>
                          <TableCell>R$ {(item.priceCents / 100).toFixed(2)}</TableCell>
                          <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy")}</TableCell>
                          <TableCell><span className={cn("px-2 py-1 rounded-full text-xs font-medium", item.status === 'active' ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{item.status}</span></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {historyPagination.totalPages > 1 && (
                <div className="mt-4 flex justify-end">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem><PaginationPrevious onClick={() => historyPagination.page > 1 && fetchHistory(historyPagination.page - 1)} /></PaginationItem>
                      <PaginationItem><PaginationNext onClick={() => historyPagination.page < historyPagination.totalPages && fetchHistory(historyPagination.page + 1)} /></PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </ChartCard>
          )}

          {activeStep === "assets" && (
            <ChartCard title="Meus Ativos">
              <div className="text-center py-12">
                <LayoutDashboard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">Em breve: visualize todos os seus ativos consolidados aqui.</p>
              </div>
            </ChartCard>
          )}

          {activeStep === "comments" && (
            <ChartCard 
              title="Comentários e Feedback"
              actions={
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => fetchComments(commentsPagination.page)}
                    disabled={commentsLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", commentsLoading && "animate-spin")} />
                    Atualizar
                  </Button>
                  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Comentário
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Comentário</DialogTitle>
                      <DialogDescription>
                        Envie sua dúvida, sugestão ou feedback para nossa equipe.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input 
                          id="title" 
                          value={newComment.title} 
                          onChange={(e) => setNewComment({ ...newComment, title: e.target.value })} 
                          placeholder="Ex: Dúvida sobre plano"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Conteúdo</Label>
                        <Textarea 
                          id="content" 
                          value={newComment.content} 
                          onChange={(e) => setNewComment({ ...newComment, content: e.target.value })} 
                          placeholder="Digite aqui sua mensagem..."
                          className="min-h-[150px]"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                      <Button onClick={handleAddComment} disabled={saving || !newComment.content.trim()}>
                        {saving ? "Enviando..." : "Enviar Comentário"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                </div>
              }
            >
              <div className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">No</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Processado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commentsLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
                    ) : comments.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum comentário enviado</TableCell></TableRow>
                    ) : (
                      comments.map((c, index) => (
                        <TableRow key={c.id}>
                          <TableCell>{(commentsPagination.page - 1) * 10 + index + 1}</TableCell>
                          <TableCell className="font-medium">{c.title || "Sem título"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{c.content}</TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'replied' ? 'success' : 'secondary'} className={cn(c.status === 'replied' ? "bg-success/10 text-success border-success/20" : "")}>
                              {c.status === 'replied' ? 'Respondido' : 'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {c.status === 'replied' ? 'Finalizado' : 'Em análise'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {c.processed_at ? format(new Date(c.processed_at), "dd/MM/yyyy HH:mm") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  setSelectedComment(c);
                                  setIsDetailModalOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteComment(c.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Detail Modal */}
                <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{selectedComment?.title || "Detalhes do Comentário"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Sua Mensagem</Label>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm whitespace-pre-wrap">
                          {selectedComment?.content}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right italic">
                          Enviado em: {selectedComment && format(new Date(selectedComment.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>

                      {selectedComment?.reply && (
                        <div className="space-y-2">
                          <Label className="text-success font-semibold">Resposta do Administrador</Label>
                          <div className="p-4 bg-success/5 rounded-lg border border-success/20 text-sm whitespace-pre-wrap">
                            {selectedComment.reply}
                          </div>
                          <p className="text-[10px] text-muted-foreground text-right italic">
                            Respondido em: {selectedComment.processed_at && format(new Date(selectedComment.processed_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      )}

                      {!selectedComment?.reply && (
                        <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground italic">
                          Aguardando resposta da nossa equipe...
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setIsDetailModalOpen(false)}>Fechar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {commentsPagination.totalPages > 1 && (
                  <div className="flex justify-end pt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => commentsPagination.page > 1 && fetchComments(commentsPagination.page - 1)}
                            className={cn(commentsPagination.page === 1 && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => commentsPagination.page < commentsPagination.totalPages && fetchComments(commentsPagination.page + 1)}
                            className={cn(commentsPagination.page === commentsPagination.totalPages && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
