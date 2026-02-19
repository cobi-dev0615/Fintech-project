import { useState, useEffect, useCallback } from "react";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  TrendingUp,
  TrendingDown,
  GripVertical,
  CheckCircle2,
  DollarSign,
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
import { goalsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { cn } from "@/lib/utils";

// --- Types ---

type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string | null;
  category: string;
};

// --- KPI Card types & component ---

interface GoalKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableGoalKpiCard({ id, kpi }: { id: string; kpi: GoalKpiDef }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
          {kpi.change && kpi.changeType !== "neutral" && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`flex items-center gap-0.5 ${
                  kpi.changeType === "positive"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {kpi.changeType === "positive" ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-semibold tabular-nums">
                  {kpi.change}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- KPI IDs ---

const GOALS_KPI_IDS = [
  "goal-total",
  "goal-completed",
  "goal-saved",
  "goal-avg",
] as const;

const Goals = () => {
  const { t, i18n } = useTranslation(['goals', 'common']);
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();

  const CATEGORY_OPTIONS = [
    { value: "general", label: t('goals:categories.general') },
    { value: "emergency", label: t('goals:categories.emergency') },
    { value: "car", label: t('goals:categories.car') },
    { value: "travel", label: t('goals:categories.travel') },
    { value: "house", label: t('goals:categories.house') },
    { value: "education", label: t('goals:categories.education') },
    { value: "other", label: t('goals:categories.other') },
  ];
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState<number | "">("");
  const [newCurrent, setNewCurrent] = useState<number | "">("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState<number | "">("");
  const [editCurrent, setEditCurrent] = useState<number | "">("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await goalsApi.getAll();
      setGoals(res.goals || []);
      setError(null);
    } catch (err: unknown) {
      setError((err as { error?: string })?.error || t('goals:errorLoading'));
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // --- KPI drag order ---
  const kpiStorageKey = `goals-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === GOALS_KPI_IDS.length &&
          GOALS_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...GOALS_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  // --- CRUD handlers ---

  const openCreate = () => {
    setEditingId(null);
    setNewName("");
    setNewTarget("");
    setNewCurrent("");
    setNewDeadline("");
    setNewCategory("");
    setDialogOpen(true);
  };

  const openEdit = (g: Goal) => {
    setEditingId(g.id);
    setEditName(g.name);
    setEditTarget(g.target);
    setEditCurrent(g.current);
    setEditDeadline(g.deadline ? g.deadline.slice(0, 10) : "");
    setEditCategory(g.category || "");
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    const targetNum = newTarget === "" ? 0 : newTarget;
    if (!newName.trim()) {
      toast({ title: t('goals:dialog.nameRequired'), variant: "warning" });
      return;
    }
    try {
      await goalsApi.create({
        name: newName.trim(),
        target: targetNum,
        deadline: newDeadline || undefined,
        category: newCategory || undefined,
      });
      toast({ title: t('goals:toast.created'), variant: "success" });
      setDialogOpen(false);
      fetchGoals();
    } catch (err: unknown) {
      const apiErr = err as { error?: string; limit?: number; upgradePlan?: string; requiredPlan?: string; message?: string };
      if (apiErr.error === 'limit_reached' || apiErr.error === 'upgrade_required') {
        setDialogOpen(false);
        const plan = apiErr.upgradePlan || apiErr.requiredPlan || 'premium';
        toast({
          title: t('goals:toast.limitReached'),
          description: apiErr.error === 'limit_reached'
            ? t('goals:toast.limitReachedDesc', { limit: apiErr.limit, plan })
            : t('goals:toast.upgradeRequiredDesc', { plan }),
          variant: "warning",
        });
      } else {
        toast({
          title: t('goals:toast.createError'),
          description: t('goals:toast.createErrorDesc'),
          variant: "destructive",
        });
      }
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const targetNum = editTarget === "" ? undefined : editTarget;
    const currentNum = editCurrent === "" ? undefined : editCurrent;
    if (!editName.trim()) {
      toast({ title: t('goals:dialog.nameRequired'), variant: "warning" });
      return;
    }
    try {
      await goalsApi.update(editingId, {
        name: editName.trim(),
        target: targetNum,
        current: currentNum,
        deadline: editDeadline || undefined,
        category: editCategory || undefined,
      });
      toast({ title: t('goals:toast.updated'), variant: "success" });
      setDialogOpen(false);
      setEditingId(null);
      fetchGoals();
    } catch (err: unknown) {
      const apiErr = err as { error?: string; limit?: number; upgradePlan?: string; requiredPlan?: string; message?: string };
      if (apiErr.error === 'limit_reached' || apiErr.error === 'upgrade_required') {
        setDialogOpen(false);
        setEditingId(null);
        const plan = apiErr.upgradePlan || apiErr.requiredPlan || 'premium';
        toast({
          title: t('goals:toast.limitReached'),
          description: apiErr.error === 'limit_reached'
            ? t('goals:toast.limitReachedDesc', { limit: apiErr.limit, plan })
            : t('goals:toast.upgradeRequiredDesc', { plan }),
          variant: "warning",
        });
      } else {
        toast({
          title: t('goals:toast.updateError'),
          description: t('goals:toast.updateErrorDesc'),
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await goalsApi.delete(deleteId);
      toast({ title: t('goals:toast.deleted'), variant: "success" });
      setDeleteId(null);
      fetchGoals();
    } catch (err: unknown) {
      toast({
        title: t('goals:toast.deleteError'),
        description: t('goals:toast.deleteErrorDesc'),
        variant: "destructive",
      });
    }
  };

  const isEdit = editingId != null;

  // --- KPI computed values ---

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.target > 0 && g.current >= g.target).length;
  const totalSaved = goals.reduce((sum, g) => sum + g.current, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0);

  const goalsWithTarget = goals.filter((g) => g.target > 0);
  const avgProgress =
    goalsWithTarget.length > 0
      ? goalsWithTarget.reduce((sum, g) => sum + Math.min(100, (g.current / g.target) * 100), 0) /
        goalsWithTarget.length
      : 0;

  const kpiData: Record<string, GoalKpiDef> = {
    "goal-total": {
      title: t("goals:kpi.totalGoals"),
      value: String(totalGoals),
      change: totalGoals > 0
        ? t("goals:kpi.goals", { count: totalGoals })
        : undefined,
      changeType: totalGoals > 0 ? "positive" : "neutral",
      icon: Target,
      watermark: Target,
    },
    "goal-completed": {
      title: t("goals:kpi.completed"),
      value: String(completedGoals),
      change: completedGoals > 0
        ? t("goals:kpi.achieved")
        : undefined,
      changeType: completedGoals > 0 ? "positive" : "neutral",
      icon: CheckCircle2,
      watermark: CheckCircle2,
    },
    "goal-saved": {
      title: t("goals:kpi.totalSaved"),
      value: formatCurrency(totalSaved),
      change: totalTarget > 0
        ? t("goals:kpi.ofTarget", { amount: formatCurrency(totalTarget) })
        : undefined,
      changeType: totalSaved > 0 ? "positive" : "neutral",
      icon: DollarSign,
      watermark: DollarSign,
    },
    "goal-avg": {
      title: t("goals:kpi.avgProgress"),
      value: `${avgProgress.toFixed(0)}%`,
      change: goalsWithTarget.length > 0
        ? t("goals:kpi.acrossGoals")
        : undefined,
      changeType: avgProgress > 0 ? "positive" : "neutral",
      icon: TrendingUp,
      watermark: TrendingUp,
    },
  };

  // --- KPI grid JSX ---
  const kpiGrid = (
    <DndContext
      sensors={kpiSensors}
      collisionDetection={closestCenter}
      onDragEnd={handleKpiDragEnd}
    >
      <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiOrder.map((id) => {
            const kpi = kpiData[id];
            if (!kpi) return null;
            return <SortableGoalKpiCard key={id} id={id} kpi={kpi} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      {kpiGrid}

      {/* Goals list */}
      <ChartCard
        title={t("goals:yourGoals")}
        subtitle={t("goals:yourGoalsSubtitle")}
        actions={
          <Button onClick={openCreate} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            {t("goals:newGoal")}
          </Button>
        }
      >
        {loading ? (
          <div className="grid gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
            {error}
          </div>
        ) : goals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Target className="h-10 w-10 text-primary" />
            </div>
            <p className="font-medium text-foreground">{t('goals:noGoals')}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {t('goals:noGoalsDesc')}
            </p>
            <Button onClick={openCreate} className="mt-6">
              <Plus className="h-4 w-4 mr-2" />
              {t('goals:createFirst')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => {
              const progress = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
              const progressColor =
                progress >= 100
                  ? "bg-emerald-500"
                  : progress >= 66
                    ? "bg-emerald-500"
                    : progress >= 33
                      ? "bg-amber-500"
                      : "bg-primary";
              return (
                <div
                  key={g.id}
                  className="rounded-xl border border-border bg-card p-4 min-w-0 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{g.name}</h3>
                      {g.category && (
                        <span className="inline-block mt-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                          {t(`goals:categories.${g.category}`, { defaultValue: g.category })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(g)}
                        aria-label={t('goals:editGoal')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(g.id)}
                        aria-label={t('goals:deleteGoal')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{formatCurrency(g.current)}</span>
                        {" / "}
                        {formatCurrency(g.target)}
                      </p>
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums shrink-0",
                          progress >= 100 && "text-emerald-600 dark:text-emerald-400",
                          progress >= 33 && progress < 100 && "text-amber-600 dark:text-amber-400",
                          progress < 33 && "text-muted-foreground"
                        )}
                      >
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", progressColor)}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  {g.deadline && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {t('goals:deadline', { date: new Date(g.deadline).toLocaleDateString(i18n.language) })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? t('goals:dialog.editTitle') : t('goals:dialog.createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('goals:dialog.name')}</Label>
              <Input
                id="name"
                value={isEdit ? editName : newName}
                onChange={(e) => (isEdit ? setEditName(e.target.value) : setNewName(e.target.value))}
                placeholder={t('goals:dialog.namePlaceholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target">{t('goals:dialog.targetValue')}</Label>
              <Input
                id="target"
                type="number"
                min={0}
                step={0.01}
                value={isEdit ? (editTarget === "" ? "" : editTarget) : (newTarget === "" ? "" : newTarget)}
                onChange={(e) => {
                  const v = e.target.value === "" ? "" : Number(e.target.value);
                  if (isEdit) setEditTarget(v); else setNewTarget(v);
                }}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">{t('goals:dialog.targetHint')}</p>
            </div>
            {isEdit && (
              <div className="grid gap-2">
                <Label htmlFor="current">{t('goals:dialog.currentValue')}</Label>
                <Input
                  id="current"
                  type="number"
                  min={0}
                  step={0.01}
                  value={editCurrent === "" ? "" : editCurrent}
                  onChange={(e) =>
                    setEditCurrent(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">{t('goals:dialog.currentHint')}</p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="deadline">{t('goals:dialog.deadlineLabel')}</Label>
              <Input
                id="deadline"
                type="date"
                value={isEdit ? editDeadline : newDeadline}
                onChange={(e) => (isEdit ? setEditDeadline(e.target.value) : setNewDeadline(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('goals:dialog.category')}</Label>
              <Select
                value={(isEdit ? editCategory : newCategory) || "none"}
                onValueChange={(v) => (isEdit ? setEditCategory(v === "none" ? "" : v) : setNewCategory(v === "none" ? "" : v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('goals:dialog.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('goals:dialog.categoryNone')}</SelectItem>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                  {(isEdit ? editCategory : newCategory) &&
                    !CATEGORY_OPTIONS.some(o => o.value === (isEdit ? editCategory : newCategory)) && (
                      <SelectItem value={isEdit ? editCategory : newCategory}>
                        {t(`goals:categories.${isEdit ? editCategory : newCategory}`, { defaultValue: isEdit ? editCategory : newCategory })}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button onClick={isEdit ? handleUpdate : handleCreate}>
              {isEdit ? t('goals:dialog.save') : t('goals:dialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goals:deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('goals:deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Goals;
