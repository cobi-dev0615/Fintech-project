import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Save, Plus, Trash2, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
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
        title: "Sucesso",
        description: `Plano excluído com sucesso!`,
      });
      setIsDeleteDialogOpen(false);
      setPlanToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.error || error?.details || "Falha ao excluir plano",
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

  const handleSavePlan = () => {
    if (!editingPlan) return;

    if (!editingPlan.code || !editingPlan.name) {
      toast({
        title: "Erro",
        description: "Código e nome são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (editingPlan.id) {
      setPlans(plans.map((p) => (p.id === editingPlan.id ? editingPlan : p)));
    } else {
      setPlans([...plans, { ...editingPlan, id: editingPlan.code }]);
    }
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

  const handleSavePlans = async () => {
    setSaving(true);
    try {
      await adminApi.updatePlans(
        plans.map((p) => ({
          code: p.code,
          name: p.name,
          priceCents: Math.round(p.price * 100),
          connectionLimit: p.connectionLimit || null,
          features: p.features,
          isActive: p.isActive ?? true,
        }))
      );
      toast({
        title: "Sucesso",
        description: "Planos salvos com sucesso!",
      });
      // Refresh plans after save
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
    } catch (error: any) {
      console.error("Failed to save plans:", error);
      toast({
        title: "Erro",
        description: error?.error || "Falha ao salvar planos",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  const getPlanDescription = (code: string) => {
    const descriptions: Record<string, string> = {
      free: 'Ideal para começar',
      basic: 'Para quem quer mais',
      pro: 'Controle total',
    };
    return descriptions[code.toLowerCase()] || '';
  };

  const getPlanFeatures = (plan: Plan) => {
    // If features are defined, use them, otherwise generate from plan properties
    if (plan.features && plan.features.length > 0) {
      return plan.features;
    }
    
    // Generate features based on plan code and properties
    const features: string[] = [];
    if (plan.connectionLimit !== null) {
      features.push(`${plan.connectionLimit} conexão${plan.connectionLimit > 1 ? 'ões' : ''} bancária${plan.connectionLimit > 1 ? 's' : ''}`);
    } else {
      features.push('Conexões ilimitadas');
    }
    
    if (plan.code.toLowerCase() === 'free') {
      features.push('Dashboard básico', 'Cotações de mercado');
    } else if (plan.code.toLowerCase() === 'basic') {
      features.push('Relatórios mensais', 'Câmbio e Crédito', 'Suporte por email');
    } else if (plan.code.toLowerCase() === 'pro') {
      features.push('IA Financeira', 'Relatórios ilimitados', 'Suporte prioritário', 'Alertas personalizados');
    }
    
    return features;
  };

  const isPopularPlan = (code: string) => {
    return code.toLowerCase() === 'pro';
  };

  // Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Page Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Plan Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>

        {/* Plans List Skeleton */}
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Planos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie planos e preços de assinatura
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">{(error as any)?.error || "Erro ao carregar planos"}</p>
        </div>
      </div>
    );
  }

  const mainPlans = plans.filter(p => ['free', 'basic', 'pro'].includes(p.code.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie planos e preços de assinatura
          </p>
        </div>
        <Button onClick={handleSavePlans} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      {/* Plan Cards */}
      {mainPlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mainPlans.map((plan) => {
            const isPopular = isPopularPlan(plan.code);
            const planFeatures = getPlanFeatures(plan);
            const isFree = plan.price === 0;
            
            return (
              <div
                key={plan.id || plan.code}
                className={`relative rounded-lg border-2 p-6 transition-all ${
                  isPopular
                    ? 'border-primary bg-primary/5 scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    Mais Popular
                  </Badge>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{getPlanDescription(plan.code)}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">
                        R$ {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      {!isFree && (
                        <span className="text-sm text-muted-foreground">/mês</span>
                      )}
                    </div>
                    {isFree && (
                      <span className="text-sm text-muted-foreground">para sempre</span>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mt-6">
                    {planFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className={`w-full mt-6 ${
                      isPopular
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-primary/90 hover:bg-primary'
                    }`}
                    variant={isPopular ? 'default' : 'default'}
                  >
                    {isFree ? 'Começar Grátis' : `Assinar ${plan.name.split(' ')[0]}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plans List */}
      <ChartCard title={`${plans.length} Plano${plans.length !== 1 ? "s" : ""}`}>
        <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id || plan.code}
                className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      <span className="text-lg font-bold text-primary">
                        R$ {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                      </span>
                      {plan.connectionLimit !== null && (
                        <span className="text-sm text-muted-foreground">
                          ({plan.connectionLimit} conexões)
                        </span>
                      )}
                      {plan.connectionLimit === null && (
                        <span className="text-sm text-muted-foreground">
                          (Ilimitado)
                        </span>
                      )}
                      {!plan.isActive && (
                        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.features.map((feature, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                        >
                          {feature}
                        </span>
                      ))}
                      {plan.features.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                          Nenhuma feature definida
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(plan)}
                      className="text-destructive hover:text-destructive"
                      title="Excluir plano"
                      disabled={plan.code.toLowerCase() === 'free'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum plano cadastrado
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={handleAddPlan}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Novo Plano
            </Button>
        </div>
      </ChartCard>

      {/* Plan Edit Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan?.id ? "Editar Plano" : "Adicionar Novo Plano"}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do plano
            </DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planCode">
                    Código * <span className="text-xs text-muted-foreground">(único, não pode ser alterado)</span>
                  </Label>
                  <Input
                    id="planCode"
                    value={editingPlan.code}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, code: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                    }
                    disabled={!!editingPlan.id}
                    placeholder="ex: free, basic, pro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planName">Nome *</Label>
                  <Input
                    id="planName"
                    value={editingPlan.name}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, name: e.target.value })
                    }
                    placeholder="ex: Gratuito, Básico"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planPrice">Preço (R$/mês) *</Label>
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
                  <Label htmlFor="connectionLimit">Limite de Conexões</Label>
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
                    placeholder="Deixe vazio para ilimitado"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features do Plano</Label>
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
                      placeholder="Adicionar nova feature"
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
                  <Label htmlFor="planActive">Plano ativo</Label>
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
                    Cancelar
                  </Button>
                  <Button onClick={handleSavePlan}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
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
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{planToDelete?.name}"? Esta ação não pode ser desfeita.
              {planToDelete?.code.toLowerCase() === 'free' && (
                <span className="block mt-2 text-destructive font-medium">
                  O plano gratuito não pode ser excluído.
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
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={deleting || planToDelete?.code.toLowerCase() === 'free'}
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

export default PlanManagement;

