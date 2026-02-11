import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface Plan {
  id?: string;
  code: string;
  name: string;
  price: number;
  features: string[];
  connectionLimit?: number | null;
  isActive?: boolean;
}

const PlanManagement = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const { toast } = useToast();

  // Fetch plans with React Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: async () => {
      const response = await adminApi.getPlans();
      return response.plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        price: p.priceCents / 100,
        features: p.features || [],
        connectionLimit: p.connectionLimit,
        isActive: p.isActive,
      }));
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Update local plans state when query data changes
  useEffect(() => {
    if (data) {
      setPlans(data);
    }
  }, [data]);

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminApi.deletePlan(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      toast({
        title: t('common:success'),
        description: t('admin:planManagement.deleteSuccess'),
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
      setPlanToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error?.error || error?.details || t('admin:planManagement.deleteError'),
        variant: "destructive",
      });
    },
  });

  // Save plan mutation
  const savePlanMutation = useMutation({
    mutationFn: async (plan: Plan) => {
      await adminApi.updatePlans([
        {
          code: plan.code,
          name: plan.name,
          priceCents: Math.round(plan.price * 100),
          connectionLimit: plan.connectionLimit || null,
          features: plan.features,
          isActive: plan.isActive ?? true,
          role: null, // All plans available to all users
        }
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      toast({
        title: t('common:success'),
        description: t('admin:planManagement.updateSuccess'),
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error?.error || t('admin:planManagement.updateError'),
        variant: "destructive",
      });
    },
  });

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan({ ...plan });
    setIsPlanDialogOpen(true);
  };

  const handleAddPlan = () => {
    setEditingPlan({
      code: "",
      name: "",
      price: 0,
      features: [],
      connectionLimit: null,
      isActive: true,
    });
    setIsPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;

    if (!editingPlan.code || !editingPlan.name) {
      toast({
        title: t('common:error'),
        description: t('common:requiredFields'),
        variant: "destructive",
      });
      return;
    }

    // Update local state immediately for better UX
    if (editingPlan.id) {
      setPlans(plans.map((p) => (p.id === editingPlan.id ? editingPlan : p)));
    } else {
      setPlans([...plans, { ...editingPlan, id: editingPlan.code }]);
    }

    // Save to backend
    await savePlanMutation.mutateAsync(editingPlan);
    
    setIsPlanDialogOpen(false);
    setEditingPlan(null);
    setNewFeature("");
  };

  const handleAddFeature = () => {
    if (!editingPlan || !newFeature.trim()) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, newFeature.trim()],
    });
    setNewFeature("");
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.filter((_, i) => i !== index),
    });
  };

  const handleDeleteClick = (plan: Plan) => {
    setPlanToDelete(plan);
    setIsDeleteDialogOpen(true);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete || !planToDelete.id) return;
    setDeleting(true);
    await deletePlanMutation.mutateAsync(planToDelete.id);
    setDeleting(false);
  };

  // Card color based on plan type
  const getCardColor = (code: string) => {
    switch (code.toLowerCase()) {
      case 'free':
        return 'border-gray-500/50 bg-gray-500/5 hover:border-gray-500';
      case 'basic':
        return 'border-blue-500/50 bg-blue-500/5 hover:border-blue-500';
      case 'pro':
        return 'border-green-500/50 bg-green-500/5 hover:border-green-500';
      case 'consultant':
        return 'border-purple-500/50 bg-purple-500/5 hover:border-purple-500';
      case 'enterprise':
        return 'border-yellow-500/50 bg-yellow-500/5 hover:border-yellow-500';
      default:
        return 'border-blue-500/50 bg-blue-500/5 hover:border-blue-500';
    }
  };

  // Sort plans by price
  const sortedPlans = [...plans].sort((a, b) => a.price - b.price);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin:planManagement.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin:planManagement.subtitle')}
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">{(error as any)?.error || t('common:errorLoading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin:planManagement.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('admin:planManagement.subtitle')}
        </p>
      </div>

      {/* Plan Cards Grid */}
      <div className="flex flex-wrap gap-6">
        {sortedPlans.map((plan) => {
          const isFree = plan.price === 0;
          const cardColor = getCardColor(plan.code);
          
          return (
            <div
              key={plan.id || plan.code}
              className={`relative rounded-lg border-2 p-6 transition-all w-[280px] ${cardColor}`}
            >
              {/* Edit and Delete Icons */}
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEditPlan(plan)}
                  title={t('admin:planManagement.editPlan')}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteClick(plan)}
                  title={t('common:delete')}
                  disabled={plan.code.toLowerCase() === 'free'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground uppercase">{plan.code}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      R$ {plan.price.toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}
                    </span>
                    {!isFree && (
                      <span className="text-sm text-muted-foreground">/{t('common:month')}</span>
                    )}
                  </div>
                  {isFree && (
                    <span className="text-sm text-muted-foreground">{t('common:forever')}</span>
                  )}
                </div>
                
                {plan.connectionLimit !== null && (
                  <p className="text-sm text-muted-foreground">
                    {plan.connectionLimit} {plan.connectionLimit === 1 ? t('common:connection') : t('common:connections')}
                  </p>
                )}
                {plan.connectionLimit === null && (
                  <p className="text-sm text-muted-foreground">{t('common:unlimitedConnections')}</p>
                )}
                
                <ul className="space-y-2 mt-4 max-h-48 overflow-y-auto">
                  {plan.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 5 && (
                    <li className="text-xs text-muted-foreground">
                      +{plan.features.length - 5} {t('common:more')}
                    </li>
                  )}
                  {plan.features.length === 0 && (
                    <li className="text-xs text-muted-foreground italic">
                      {t('common:noFeaturesDefined')}
                    </li>
                  )}
                </ul>

                {!plan.isActive && (
                  <div className="mt-2">
                    <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                      {t('common:inactive')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Plan Card */}
        <div
          className="relative rounded-lg border-2 border-dashed p-6 transition-all cursor-pointer hover:border-primary w-[280px] border-primary/30 bg-primary/5"
          onClick={handleAddPlan}
        >
          <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('admin:planManagement.createPlan')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('common:clickToCreate')}
            </p>
          </div>
        </div>
      </div>

      {/* Plan Edit Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan?.id ? t('admin:planManagement.editPlan') : t('admin:planManagement.createPlan')}
            </DialogTitle>
            <DialogDescription>
              {t('common:configurePlanDetails')}
            </DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planCode">
                    {t('common:code')} * <span className="text-xs text-muted-foreground">({t('common:unique')})</span>
                  </Label>
                  <Input
                    id="planCode"
                    value={editingPlan.code}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, code: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                    }
                    disabled={!!editingPlan.id}
                    placeholder={t('common:codePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planName">{t('common:name')} *</Label>
                  <Input
                    id="planName"
                    value={editingPlan.name}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, name: e.target.value })
                    }
                    placeholder={t('common:namePlaceholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planPrice">{t('common:pricePerMonth')} *</Label>
                  <Input
                    id="planPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingPlan.price}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connectionLimit">{t('common:connectionLimit')}</Label>
                  <Input
                    id="connectionLimit"
                    type="number"
                    min="0"
                    value={editingPlan.connectionLimit || ""}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        connectionLimit: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    placeholder={t('common:leaveEmptyForUnlimited')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('common:planFeatures')}</Label>
                <div className="space-y-2">
                  {editingPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...editingPlan.features];
                          newFeatures[index] = e.target.value;
                          setEditingPlan({ ...editingPlan, features: newFeatures });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFeature(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      placeholder={t('common:addNewFeature')}
                    />
                    <Button variant="outline" onClick={handleAddFeature}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="planActive"
                    checked={editingPlan.isActive ?? true}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, isActive: e.target.checked })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="planActive">{t('common:activePlan')}</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPlanDialogOpen(false);
                      setEditingPlan(null);
                      setNewFeature("");
                    }}
                  >
                    {t('common:cancel')}
                  </Button>
                  <Button onClick={handleSavePlan} disabled={savePlanMutation.isPending}>
                    {savePlanMutation.isPending ? t('common:saving') : t('common:save')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common:confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common:deletePlanConfirmation', { name: planToDelete?.name })}
              {planToDelete?.code.toLowerCase() === 'free' && (
                <span className="block mt-2 text-destructive font-medium">
                  {t('common:freePlanCannotBeDeleted')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setPlanToDelete(null);
              }}
              disabled={deleting}
            >
              {t('common:cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={deleting || planToDelete?.code.toLowerCase() === 'free'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('common:deleting') : t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlanManagement;
