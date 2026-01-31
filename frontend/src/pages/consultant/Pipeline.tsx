import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Phone, Mail, Edit, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Prospect {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  notes?: string;
}

const Pipeline = () => {
  const stageOrder = ['lead', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
  const stageLabels: Record<string, string> = {
    'lead': 'Contato Inicial',
    'contacted': 'Contatado',
    'meeting': 'Reunião',
    'proposal': 'Proposta',
    'won': 'Fechamento',
    'lost': 'Perdido',
  };

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createSelectOpen, setCreateSelectOpen] = useState(false);
  const [editSelectOpen, setEditSelectOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    stage: 'lead',
    notes: '',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['consultant', 'pipeline'],
    queryFn: () => consultantApi.getPipeline(),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const prospects = data?.prospects || [];
  const loading = isLoading;

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      stage: 'lead',
      notes: '',
    });
    setSelectedProspect(null);
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setCreateSelectOpen(false);
    setIsCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = (open: boolean) => {
    if (!open) {
      setCreateSelectOpen(false);
    }
    setIsCreateDialogOpen(open);
  };

  // Ensure Select closes when dialog closes
  useEffect(() => {
    if (!isCreateDialogOpen) {
      setCreateSelectOpen(false);
    }
  }, [isCreateDialogOpen]);

  const handleOpenEditDialog = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setFormData({
      name: prospect.name || '',
      email: prospect.email || '',
      phone: prospect.phone || '',
      stage: prospect.stage || 'lead',
      notes: prospect.notes || '',
    });
    setEditSelectOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = (open: boolean) => {
    if (!open) {
      setEditSelectOpen(false);
    }
    setIsEditDialogOpen(open);
  };

  // Ensure Select closes when dialog closes
  useEffect(() => {
    if (!isEditDialogOpen) {
      setEditSelectOpen(false);
    }
  }, [isEditDialogOpen]);

  const handleOpenDeleteDialog = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateProspect = async () => {
    if (!formData.email.trim()) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      await consultantApi.createProspect({
        name: formData.name.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        stage: formData.stage,
        notes: formData.notes.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Prospecto criado com sucesso",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao criar prospecto",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProspect = async () => {
    if (!selectedProspect) return;

    if (!formData.email.trim()) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      await consultantApi.updateProspect(selectedProspect.id, {
        name: formData.name.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        stage: formData.stage,
        notes: formData.notes.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Prospecto atualizado com sucesso",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao atualizar prospecto",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProspect = async () => {
    if (!selectedProspect) return;

    setDeletingId(selectedProspect.id);
    try {
      await consultantApi.deleteProspect(selectedProspect.id);
      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
      setIsDeleteDialogOpen(false);
      setSelectedProspect(null);
      setDeletingId(null);
      toast({
        title: "Sucesso",
        description: "Prospecto removido com sucesso",
        variant: "success",
      });
    } catch (err: any) {
      setDeletingId(null);
      toast({
        title: "Erro",
        description: err?.error || "Erro ao remover prospecto",
        variant: "destructive",
      });
    }
  };

  const handlePhoneCall = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleSendEmail = (email: string) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const moveProspect = async (prospectId: string, direction: "left" | "right") => {
    const prospect = prospects.find(p => p.id === prospectId);
    if (!prospect) return;

    const currentIndex = stageOrder.indexOf(prospect.stage);
    let newStage: string;

    if (direction === "right" && currentIndex < stageOrder.length - 1) {
      newStage = stageOrder[currentIndex + 1];
    } else if (direction === "left" && currentIndex > 0) {
      newStage = stageOrder[currentIndex - 1];
    } else {
      return;
    }

    // Optimistic update
    queryClient.setQueryData(['consultant', 'pipeline'], (old: any) => ({
      ...old,
      prospects: old.prospects.map((p: Prospect) =>
        p.id === prospectId ? { ...p, stage: newStage } : p
      ),
    }));

    try {
      await consultantApi.updateProspectStage(prospectId, newStage);
      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
    } catch (err: any) {
      console.error("Error updating prospect stage:", err);
      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
      toast({
        title: "Erro",
        description: err?.error || "Erro ao atualizar estágio",
        variant: "destructive",
      });
    }
  };

  const getProspectsByStage = (stage: string) => {
    return prospects.filter((p) => p.stage === stage);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de Prospecção</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus prospectos por estágio
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Prospecto
        </Button>
      </div>

      {loading && !prospects.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-destructive">{(error as any)?.error || "Erro ao carregar pipeline"}</p>
        </div>
      ) : (
        /* Pipeline Kanban */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {stageOrder.map((stage) => {
            const stageProspects = getProspectsByStage(stage);
            return (
              <div
                key={stage}
                className="flex flex-col min-h-[400px] max-h-[calc(100vh-200px)] w-full min-w-[280px]"
              >
                <ChartCard
                  title={stageLabels[stage] || stage}
                  subtitle={`${stageProspects.length} prospecto${stageProspects.length !== 1 ? "s" : ""}`}
                  className="flex flex-col h-full min-w-0 overflow-hidden"
                >
                  <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 min-w-0">
                    {stageProspects.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground px-2">
                        Nenhum prospecto neste estágio
                      </div>
                    ) : (
                      stageProspects.map((prospect) => (
                        <div
                          key={prospect.id}
                          className="p-3 rounded-lg border border-border bg-card hover:shadow-md transition-shadow w-full min-w-0 max-w-full box-border"
                        >
                          <div className="flex items-start justify-between mb-2 gap-2 min-w-0">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <h4 className="text-sm font-semibold text-foreground mb-1 truncate">
                                {prospect.name || 'Sem nome'}
                              </h4>
                              {prospect.notes && (
                                <p className="text-xs text-muted-foreground line-clamp-2 break-words overflow-hidden">
                                  {prospect.notes}
                                </p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 flex-shrink-0 ml-1">
                                  <span className="sr-only">Menu</span>
                                  <span className="text-muted-foreground text-lg leading-none">⋯</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {prospect.phone && (
                                  <DropdownMenuItem onClick={() => handlePhoneCall(prospect.phone)}>
                                    <Phone className="h-4 w-4 mr-2" />
                                    Ligar
                                  </DropdownMenuItem>
                                )}
                                {prospect.email && (
                                  <DropdownMenuItem onClick={() => handleSendEmail(prospect.email)}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Enviar Email
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(prospect)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleOpenDeleteDialog(prospect)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <div className="space-y-1.5 text-xs text-muted-foreground min-w-0">
                            {prospect.email && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Mail className="h-3 w-3 shrink-0 flex-shrink-0" />
                                <span className="truncate min-w-0 overflow-hidden">{prospect.email}</span>
                              </div>
                            )}
                            {prospect.phone && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Phone className="h-3 w-3 shrink-0 flex-shrink-0" />
                                <span className="truncate min-w-0 overflow-hidden">{prospect.phone}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border min-w-0">
                            {stageOrder.indexOf(stage) > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs h-7 min-w-0 px-1.5"
                                onClick={() => moveProspect(prospect.id, "left")}
                              >
                                <span className="truncate">← Anterior</span>
                              </Button>
                            )}
                            {stageOrder.indexOf(stage) < stageOrder.length - 1 && stage !== 'won' && stage !== 'lost' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs h-7 min-w-0 px-1.5"
                                onClick={() => moveProspect(prospect.id, "right")}
                              >
                                <span className="truncate">Próximo →</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ChartCard>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Prospect Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Prospecto</DialogTitle>
            <DialogDescription>
              Adicione um novo prospecto ao seu pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">Telefone</Label>
              <Input
                id="create-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-stage">Estágio</Label>
              {isCreateDialogOpen && (
                <Select
                  key={`create-${isCreateDialogOpen}`}
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                  open={createSelectOpen}
                  onOpenChange={setCreateSelectOpen}
                >
                  <SelectTrigger id="create-stage">
                    <SelectValue placeholder="Selecione o estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOrder.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stageLabels[stage]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-notes">Notas</Label>
              <Textarea
                id="create-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anotações sobre o prospecto..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProspect}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Prospect Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleCloseEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Prospecto</DialogTitle>
            <DialogDescription>
              Atualize as informações do prospecto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-stage">Estágio</Label>
              {isEditDialogOpen && (
                <Select
                  key={`edit-${isEditDialogOpen}-${selectedProspect?.id}`}
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                  open={editSelectOpen}
                  onOpenChange={setEditSelectOpen}
                >
                  <SelectTrigger id="edit-stage">
                    <SelectValue placeholder="Selecione o estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOrder.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stageLabels[stage]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notas</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anotações sobre o prospecto..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateProspect}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o prospecto{" "}
              <strong>{selectedProspect?.name || selectedProspect?.email}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProspect}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Pipeline;
