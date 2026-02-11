import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Phone, Mail, Edit, Trash2, ChevronLeft, ChevronRight, UserPlus, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Prospect {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  notes?: string;
}

const stageOrder = ['lead', 'contacted', 'meeting', 'proposal', 'won', 'lost'];

const stageStyles: Record<string, { border: string; icon: string }> = {
  lead: { border: 'border-blue-500/70', icon: 'text-blue-500' },
  contacted: { border: 'border-violet-500/70', icon: 'text-violet-500' },
  meeting: { border: 'border-emerald-500/70', icon: 'text-emerald-500' },
  proposal: { border: 'border-amber-500/70', icon: 'text-amber-500' },
  won: { border: 'border-green-500/70', icon: 'text-green-500' },
  lost: { border: 'border-muted-foreground/60', icon: 'text-muted-foreground' },
};

/** Brazilian phone: 10 digits (landline) or 11 digits (mobile 9xxxxxxxx). Optional leading 55. */
function validatePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return true;
  const normalized = digits.startsWith("55") && digits.length > 2 ? digits.slice(2) : digits;
  return (normalized.length === 10 || normalized.length === 11) && /^\d+$/.test(normalized);
}

/** Format input to digits only, max 13 (55 + DDD + 9 digits). Optionally format as (XX) XXXXX-XXXX. */
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const Pipeline = () => {
  const { t } = useTranslation(['consultant', 'common']);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Helper function for stage labels
  const getStageLabel = (stage: string) => {
    return t(`consultant:stages.${stage}`, { defaultValue: stage });
  };

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createSelectOpen, setCreateSelectOpen] = useState(false);
  const [editSelectOpen, setEditSelectOpen] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

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
    setPhoneError(null);
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
        title: t('common:error'),
        description: t('consultant:pipeline.validation.emailRequired'),
        variant: "destructive",
      });
      return;
    }
    const phoneTrimmed = formData.phone.trim();
    if (phoneTrimmed && !validatePhone(phoneTrimmed)) {
      setPhoneError(t('consultant:pipeline.validation.phoneError'));
      toast({
        title: t('consultant:pipeline.validation.phoneInvalidTitle'),
        description: t('consultant:pipeline.validation.phoneInvalidDesc'),
        variant: "destructive",
      });
      return;
    }
    setPhoneError(null);

    try {
      const phoneDigits = phoneTrimmed ? phoneTrimmed.replace(/\D/g, "") : "";
      await consultantApi.createProspect({
        name: formData.name.trim() || undefined,
        email: formData.email.trim(),
        phone: phoneDigits || undefined,
        stage: formData.stage,
        notes: formData.notes.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: t('common:success'),
        description: t('consultant:pipeline.toast.createSuccess'),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:pipeline.toast.createError'),
        variant: "destructive",
      });
    }
  };

  const handleUpdateProspect = async () => {
    if (!selectedProspect) return;

    if (!formData.email.trim()) {
      toast({
        title: t('common:error'),
        description: t('consultant:pipeline.validation.emailRequired'),
        variant: "destructive",
      });
      return;
    }
    const phoneTrimmed = formData.phone.trim();
    if (phoneTrimmed && !validatePhone(phoneTrimmed)) {
      setPhoneError(t('consultant:pipeline.validation.phoneError'));
      toast({
        title: t('consultant:pipeline.validation.phoneInvalidTitle'),
        description: t('consultant:pipeline.validation.phoneInvalidDesc'),
        variant: "destructive",
      });
      return;
    }
    setPhoneError(null);

    try {
      const phoneDigits = phoneTrimmed ? phoneTrimmed.replace(/\D/g, "") : "";
      await consultantApi.updateProspect(selectedProspect.id, {
        name: formData.name.trim() || undefined,
        email: formData.email.trim(),
        phone: phoneDigits || undefined,
        stage: formData.stage,
        notes: formData.notes.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: t('common:success'),
        description: t('consultant:pipeline.toast.updateSuccess'),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:pipeline.toast.updateError'),
        variant: "destructive",
      });
    }
  };

  const handleMoveToLost = async () => {
    if (!selectedProspect) return;

    setDeletingId(selectedProspect.id);
    // Optimistic update: move to Perdido
    queryClient.setQueryData(['consultant', 'pipeline'], (old: any) => ({
      ...old,
      prospects: old.prospects.map((p: Prospect) =>
        p.id === selectedProspect.id ? { ...p, stage: 'lost' } : p
      ),
    }));
    try {
      await consultantApi.updateProspectStage(selectedProspect.id, 'lost');
      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
      setIsDeleteDialogOpen(false);
      setSelectedProspect(null);
      setDeletingId(null);
      toast({
        title: t('common:success'),
        description: t('consultant:pipeline.toast.moveSuccess'),
        variant: "success",
      });
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
      setDeletingId(null);
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:pipeline.toast.moveError'),
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
        title: t('common:error'),
        description: err?.error || t('consultant:pipeline.toast.stageError'),
        variant: "destructive",
      });
    }
  };

  const getProspectsByStage = (stage: string) => {
    return prospects.filter((p) => p.stage === stage);
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-4 sm:space-y-6 relative">
      {/* Mobile-only: fixed icon buttons on the right at ~1/3 viewport height */}
      <div
        className="fixed right-3 top-[33vh] z-50 flex flex-col gap-2 md:hidden"
        style={{ transform: "translateY(-50%)" }}
        aria-label={t('consultant:pipeline.quickActions')}
      >
        <Button
          size="icon"
          onClick={handleOpenCreateDialog}
          className="h-11 w-11 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
          title={t('consultant:pipeline.newProspect')}
          aria-label={t('consultant:pipeline.newProspect')}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Page Header - compact on mobile; hide main CTA on mobile (use fixed icon instead) */}
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('consultant:pipeline.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            {t('consultant:pipeline.subtitle')}
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog} size="sm" className="hidden md:inline-flex shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {t('consultant:pipeline.newProspect')}
        </Button>
      </div>

      {loading && !prospects.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[220px] sm:h-72 md:h-96" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
          <GitBranch className="h-12 w-12 text-destructive/70 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">{t('consultant:pipeline.loadError')}</p>
          <p className="text-xs text-muted-foreground mt-1 px-2">{(error as any)?.error || t('consultant:pipeline.tryAgain')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4 min-w-0">
          {stageOrder.map((stage) => {
            const stageProspects = getProspectsByStage(stage);
            const style = stageStyles[stage] || stageStyles.lead;
            return (
              <div
                key={stage}
                className={cn(
                  "flex flex-col rounded-xl border-2 bg-card shadow-sm min-w-0 overflow-hidden transition-shadow hover:shadow-md min-h-[280px] sm:min-h-[320px] max-h-[72vh] sm:max-h-[75vh] md:max-h-[calc(100vh-200px)]",
                  style.border
                )}
              >
                <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-b border-border shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className={cn("h-4 w-4 shrink-0", style.icon)} />
                    <h3 className="text-sm font-semibold text-foreground truncate">{getStageLabel(stage)}</h3>
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                    {stageProspects.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 sm:space-y-3 p-3 min-w-0 min-h-0 transactions-scrollbar">
                  {stageProspects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center px-3 rounded-lg border border-dashed border-border bg-muted/20 min-h-[120px]">
                      <UserPlus className="h-10 w-10 text-muted-foreground/50 mb-2" />
                      <p className="text-xs sm:text-sm font-medium text-foreground">{t('consultant:pipeline.emptyStage')}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{t('consultant:pipeline.emptyStageDesc')}</p>
                    </div>
                  ) : (
                      stageProspects.map((prospect) => (
                        <div
                          key={prospect.id}
                          className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors w-full min-w-0 max-w-full box-border"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <h4 className="text-sm font-semibold text-foreground truncate">
                                {prospect.name || t('consultant:pipeline.noName')}
                              </h4>
                              {prospect.notes && (
                                <p className="text-xs text-muted-foreground line-clamp-2 break-words overflow-hidden mt-0.5">
                                  {prospect.notes}
                                </p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t('consultant:pipeline.openMenu')}>
                                  <span className="text-muted-foreground text-lg leading-none">⋯</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(prospect)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('consultant:pipeline.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleOpenDeleteDialog(prospect)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('consultant:pipeline.moveToLost')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="space-y-1.5 text-xs min-w-0">
                            {prospect.email && (
                              <a
                                href={`mailto:${prospect.email}`}
                                onClick={(e) => { e.preventDefault(); handleSendEmail(prospect.email); }}
                                className="flex items-center gap-2 min-w-0 text-muted-foreground hover:text-primary truncate"
                              >
                                <Mail className="h-3.5 w-3 shrink-0" />
                                <span className="truncate">{prospect.email}</span>
                              </a>
                            )}
                            {prospect.phone && (
                              <a
                                href={`tel:${prospect.phone}`}
                                onClick={(e) => { e.preventDefault(); handlePhoneCall(prospect.phone); }}
                                className="flex items-center gap-2 min-w-0 text-muted-foreground hover:text-primary truncate"
                              >
                                <Phone className="h-3.5 w-3 shrink-0" />
                                <span className="truncate">{prospect.phone}</span>
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                            {stageOrder.indexOf(stage) > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs h-8 min-w-0 gap-1"
                                onClick={() => moveProspect(prospect.id, "left")}
                              >
                                <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                                {t('consultant:pipeline.previous')}
                              </Button>
                            )}
                            {stageOrder.indexOf(stage) < stageOrder.length - 1 && stage !== 'won' && stage !== 'lost' && (
                              <Button
                                size="sm"
                                className="flex-1 text-xs h-8 min-w-0 gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => moveProspect(prospect.id, "right")}
                              >
                                {t('consultant:pipeline.next')}
                                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
            );
          })}
        </div>
      )}

      {/* Create Prospect Dialog - scrollable on mobile, side spacing */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <DialogContent className="max-h-[90vh] flex flex-col gap-0 p-4 sm:p-6 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] max-w-lg mx-auto my-4 sm:my-0">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg sm:text-xl">{t('consultant:pipeline.createDialog.title')}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('consultant:pipeline.createDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-2">
              <Label htmlFor="create-name">{t('consultant:pipeline.form.name')}</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('consultant:pipeline.form.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">{t('consultant:pipeline.form.email')} *</Label>
              <Input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('consultant:pipeline.form.emailPlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">{t('consultant:pipeline.form.phone')}</Label>
              <Input
                id="create-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); if (phoneError) setPhoneError(null); }}
                placeholder={t('consultant:pipeline.form.phonePlaceholder')}
                className={cn(phoneError && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={!!phoneError}
                aria-describedby={phoneError ? "create-phone-error" : undefined}
              />
              {phoneError && <p id="create-phone-error" className="text-xs text-destructive">{phoneError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-stage">{t('consultant:pipeline.form.stage')}</Label>
              {isCreateDialogOpen && (
                <Select
                  key={`create-${isCreateDialogOpen}`}
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                  open={createSelectOpen}
                  onOpenChange={setCreateSelectOpen}
                >
                  <SelectTrigger id="create-stage">
                    <SelectValue placeholder={t('consultant:pipeline.form.stagePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOrder.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {getStageLabel(stage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-notes" className="text-xs sm:text-sm">{t('consultant:pipeline.form.notes')}</Label>
              <Textarea
                id="create-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('consultant:pipeline.form.notesPlaceholder')}
                rows={2}
                className="min-h-0 text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => handleCloseCreateDialog(false)}>
              {t('consultant:pipeline.form.cancel')}
            </Button>
            <Button onClick={handleCreateProspect}>
              {t('consultant:pipeline.form.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Prospect Dialog - scrollable on mobile, side spacing */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleCloseEditDialog}>
        <DialogContent className="max-h-[90vh] flex flex-col gap-0 p-4 sm:p-6 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] max-w-lg mx-auto my-4 sm:my-0">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg sm:text-xl">{t('consultant:pipeline.editDialog.title')}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('consultant:pipeline.editDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('consultant:pipeline.form.name')}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('consultant:pipeline.form.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('consultant:pipeline.form.email')} *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('consultant:pipeline.form.emailPlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">{t('consultant:pipeline.form.phone')}</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('consultant:pipeline.form.phonePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-stage">{t('consultant:pipeline.form.stage')}</Label>
              {isEditDialogOpen && (
                <Select
                  key={`edit-${isEditDialogOpen}-${selectedProspect?.id}`}
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                  open={editSelectOpen}
                  onOpenChange={setEditSelectOpen}
                >
                  <SelectTrigger id="edit-stage">
                    <SelectValue placeholder={t('consultant:pipeline.form.stagePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOrder.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {getStageLabel(stage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-xs sm:text-sm">{t('consultant:pipeline.form.notes')}</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('consultant:pipeline.form.notesPlaceholder')}
                rows={2}
                className="min-h-0 text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => handleCloseEditDialog(false)}>
              {t('consultant:pipeline.form.cancel')}
            </Button>
            <Button onClick={handleUpdateProspect}>
              {t('consultant:pipeline.form.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Perdido Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('consultant:pipeline.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('consultant:pipeline.deleteDialog.description', {
                name: selectedProspect?.name || selectedProspect?.email,
                interpolation: { escapeValue: false }
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>{t('consultant:pipeline.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMoveToLost}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? t('consultant:pipeline.deleteDialog.moving') : t('consultant:pipeline.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Pipeline;
