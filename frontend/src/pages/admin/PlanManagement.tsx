import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  Users,
  Gift,
  UserCheck,
  Briefcase,
  GripVertical,
  Layers,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import ChartCard from "@/components/dashboard/ChartCard";
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

// --- Types ---

interface Plan {
  id?: string;
  code: string;
  name: string;
  price: number;
  features: string[];
  connectionLimit?: number | null;
  isActive?: boolean;
}

interface PlanKpiDef {
  title: string;
  value: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortablePlanKpiCard({ id, kpi }: { id: string; kpi: PlanKpiDef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "z-50 opacity-50 scale-105" : ""}`}
    >
      <button
        type="button"
        className="drag-handle absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/80 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none rounded-md p-1 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="kpi-card relative overflow-hidden h-full">
        <kpi.watermark className="absolute -bottom-3 -right-3 h-24 w-24 text-muted-foreground/[0.06] pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-3 relative z-10">
          <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground truncate">
            {kpi.title}
          </span>
        </div>

        <div className="relative z-10">
          <div className="text-2xl sm:text-[28px] font-bold text-foreground mb-1 tabular-nums tracking-tight leading-none">
            {kpi.value}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Constants ---

const PLAN_KPI_IDS = ["plan-subscribers", "plan-free", "plan-customer", "plan-consultant"] as const;

// --- Component ---

const PlanManagement = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { formatCurrency } = useCurrency();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const { toast } = useToast();

  // --- KPI DnD ---

  const kpiStorageKey = `admin-plans-kpi-order-${authUser?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === PLAN_KPI_IDS.length &&
          PLAN_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...PLAN_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleKpiDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setKpiOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, moved);
      localStorage.setItem(kpiStorageKey, JSON.stringify(next));
      return next;
    });
  };

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

  // Fetch all users to count subscribers per plan
  const { data: allUsers } = useQuery({
    queryKey: ['admin', 'plan-user-counts'],
    queryFn: async () => {
      const response = await adminApi.getUsers({ limit: 9999 });
      return response.users;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // --- KPI Computation ---

  const kpiData = useMemo(() => {
    // Build plan name → code mapping
    const nameToCode: Record<string, string> = {};
    plans.forEach((p) => {
      nameToCode[p.name.toLowerCase()] = p.code.toLowerCase();
    });

    const users = allUsers || [];
    const usersWithPlan = users.filter((u) => u.plan);
    const totalSubscribers = usersWithPlan.length;

    let freeCount = 0;
    let customerCount = 0;
    let consultantCount = 0;

    usersWithPlan.forEach((u) => {
      const code = nameToCode[u.plan!.toLowerCase()] || u.plan!.toLowerCase();
      if (code === "free") {
        freeCount++;
      } else if (code === "consultant") {
        consultantCount++;
      } else {
        customerCount++;
      }
    });

    return {
      "plan-subscribers": {
        title: t('admin:planManagement.kpis.totalSubscribers'),
        value: String(totalSubscribers),
        changeType: "neutral" as const,
        icon: Users,
        watermark: Users,
      },
      "plan-free": {
        title: t('admin:planManagement.kpis.freePlan'),
        value: String(freeCount),
        changeType: "neutral" as const,
        icon: Gift,
        watermark: Gift,
      },
      "plan-customer": {
        title: t('admin:planManagement.kpis.customerPlan'),
        value: String(customerCount),
        changeType: "positive" as const,
        icon: UserCheck,
        watermark: UserCheck,
      },
      "plan-consultant": {
        title: t('admin:planManagement.kpis.consultantPlan'),
        value: String(consultantCount),
        changeType: "positive" as const,
        icon: Briefcase,
        watermark: Briefcase,
      },
    };
  }, [plans, allUsers, t]);

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
          role: null,
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

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiOrder.map((id) => (
              <SortablePlanKpiCard key={id} id={id} kpi={kpiData[id as keyof typeof kpiData]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Plans Grid */}
      <ChartCard
        title={t('admin:planManagement.title')}
        subtitle={t('admin:planManagement.subtitle')}
        actions={
          <Button variant="outline" size="sm" onClick={handleAddPlan} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            {t('admin:planManagement.createPlan')}
          </Button>
        }
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-80 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-destructive">{(error as any)?.error || t('common:errorLoading')}</p>
          </div>
        ) : sortedPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Layers className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">{t('admin:planManagement.empty')}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {sortedPlans.map((plan) => {
              const isFree = plan.price === 0;
              const cardColor = getCardColor(plan.code);

              return (
                <div
                  key={plan.id || plan.code}
                  className={`relative rounded-lg border p-6 transition-all w-[280px] ${cardColor}`}
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
                          {formatCurrency(plan.price)}
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
          </div>
        )}
      </ChartCard>

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
