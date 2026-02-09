import { useState, useEffect, useCallback } from "react";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { goalsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string | null;
  category: string;
};

const Goals = () => {
  const { toast } = useToast();
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
      setError((err as { error?: string })?.error || "Erro ao carregar metas");
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

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
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    try {
      await goalsApi.create({
        name: newName.trim(),
        target: targetNum,
        deadline: newDeadline || undefined,
        category: newCategory || undefined,
      });
      toast({ title: "Meta criada", variant: "success" });
      setDialogOpen(false);
      fetchGoals();
    } catch (err: unknown) {
      toast({
        title: "Erro ao criar meta",
        description: (err as { error?: string })?.error,
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const targetNum = editTarget === "" ? undefined : editTarget;
    const currentNum = editCurrent === "" ? undefined : editCurrent;
    if (!editName.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
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
      toast({ title: "Meta atualizada", variant: "success" });
      setDialogOpen(false);
      setEditingId(null);
      fetchGoals();
    } catch (err: unknown) {
      toast({
        title: "Erro ao atualizar meta",
        description: (err as { error?: string })?.error,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await goalsApi.delete(deleteId);
      toast({ title: "Meta removida", variant: "success" });
      setDeleteId(null);
      fetchGoals();
    } catch (err: unknown) {
      toast({
        title: "Erro ao remover meta",
        variant: "destructive",
      });
    }
  };

  const isEdit = editingId != null;

  const formatCurrency = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Metas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina e acompanhe suas metas financeiras
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nova meta
        </Button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Carregando metas...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted/50 p-4 mb-3">
            <Target className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Nenhuma meta</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Crie uma meta para acompanhar seus objetivos financeiros.
          </p>
          <Button onClick={openCreate} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Criar primeira meta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const progress = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
            return (
              <div
                key={g.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-foreground truncate">{g.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(g)}
                      aria-label="Editar meta"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(g.id)}
                      aria-label="Excluir meta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(g.current)} / {formatCurrency(g.target)}
                  </p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {g.deadline && (
                  <p className="text-xs text-muted-foreground">
                    Prazo: {new Date(g.deadline).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar meta" : "Nova meta"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={isEdit ? editName : newName}
                onChange={(e) => (isEdit ? setEditName(e.target.value) : setNewName(e.target.value))}
                placeholder="Ex: Reserva de emergência"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target">Valor alvo (R$)</Label>
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
                placeholder="0,00"
              />
            </div>
            {isEdit && (
              <div className="grid gap-2">
                <Label htmlFor="current">Valor atual (R$)</Label>
                <Input
                  id="current"
                  type="number"
                  min={0}
                  step={0.01}
                  value={editCurrent === "" ? "" : editCurrent}
                  onChange={(e) =>
                    setEditCurrent(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0,00"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="deadline">Prazo (opcional)</Label>
              <Input
                id="deadline"
                type="date"
                value={isEdit ? editDeadline : newDeadline}
                onChange={(e) => (isEdit ? setEditDeadline(e.target.value) : setNewDeadline(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria (opcional)</Label>
              <Input
                id="category"
                value={isEdit ? editCategory : newCategory}
                onChange={(e) => (isEdit ? setEditCategory(e.target.value) : setNewCategory(e.target.value))}
                placeholder="Ex: Emergência"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={isEdit ? handleUpdate : handleCreate}>
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Goals;
