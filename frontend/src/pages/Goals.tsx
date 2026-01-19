import { useState, useEffect } from "react";
import { Target, Plus, TrendingUp, Calendar, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Progress } from "@/components/ui/progress";
import { goalsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string | null;
  category: string;
}

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");
  const [newGoalCategory, setNewGoalCategory] = useState("");
  const [editGoalName, setEditGoalName] = useState("");
  const [editGoalTarget, setEditGoalTarget] = useState("");
  const [editGoalCurrent, setEditGoalCurrent] = useState("");
  const [editGoalDeadline, setEditGoalDeadline] = useState("");
  const [editGoalCategory, setEditGoalCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const data = await goalsApi.getAll();
        setGoals(data.goals);
        setError(null);
      } catch (err: any) {
        setError(err?.error || "Erro ao carregar metas");
        console.error("Error fetching goals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  const handleCreateGoal = async () => {
    if (!newGoalName || !newGoalTarget) {
      toast({
        title: "Erro",
        description: "Preencha o nome e o valor da meta",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const result = await goalsApi.create({
        name: newGoalName,
        target: parseFloat(newGoalTarget),
        deadline: newGoalDeadline || undefined,
        category: newGoalCategory || undefined,
      });
      setGoals([...goals, result.goal]);
      setNewGoalName("");
      setNewGoalTarget("");
      setNewGoalDeadline("");
      setNewGoalCategory("");
      setIsDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Meta criada com sucesso",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao criar meta",
        variant: "destructive",
      });
      console.error("Error creating goal:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditGoalName(goal.name);
    setEditGoalTarget(goal.target.toString());
    setEditGoalCurrent(goal.current.toString());
    setEditGoalDeadline(goal.deadline ? new Date(goal.deadline.split("/").reverse().join("-")).toISOString().split('T')[0] : "");
    setEditGoalCategory(goal.category);
    setIsEditDialogOpen(true);
  };

  const handleUpdateGoal = async () => {
    if (!editingGoal || !editGoalName || !editGoalTarget) {
      toast({
        title: "Erro",
        description: "Preencha o nome e o valor da meta",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdating(true);
      const result = await goalsApi.update(editingGoal.id, {
        name: editGoalName,
        target: parseFloat(editGoalTarget),
        current: parseFloat(editGoalCurrent) || undefined,
        deadline: editGoalDeadline || undefined,
        category: editGoalCategory || undefined,
      });
      setGoals(goals.map(g => g.id === editingGoal.id ? result.goal : g));
      setIsEditDialogOpen(false);
      setEditingGoal(null);
      toast({
        title: "Sucesso",
        description: "Meta atualizada com sucesso",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao atualizar meta",
        variant: "destructive",
      });
      console.error("Error updating goal:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    setDeletingGoalId(goalId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteGoal = async () => {
    if (!deletingGoalId) return;

    try {
      setDeleting(true);
      await goalsApi.delete(deletingGoalId);
      setGoals(goals.filter(g => g.id !== deletingGoalId));
      setIsDeleteDialogOpen(false);
      setDeletingGoalId(null);
      toast({
        title: "Sucesso",
        description: "Meta excluída com sucesso",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao excluir meta",
        variant: "destructive",
      });
      console.error("Error deleting goal:", err);
    } finally {
      setDeleting(false);
    }
  };

  const getProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getTimeRemaining = (deadline: string | null) => {
    if (!deadline) return "Sem prazo";
    const deadlineDate = new Date(deadline.split("/").reverse().join("-"));
    const now = new Date();
    const months = (deadlineDate.getFullYear() - now.getFullYear()) * 12 + 
                   (deadlineDate.getMonth() - now.getMonth());
    return months > 0 ? `${months} mês(es)` : "Vencido";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Metas Financeiras</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe seus objetivos financeiros
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Meta Financeira</DialogTitle>
              <DialogDescription>
                Defina uma nova meta e acompanhe seu progresso
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Meta</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Reserva de Emergência"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Valor Objetivo (R$)</Label>
                <Input 
                  id="target" 
                  type="number" 
                  placeholder="50000"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Prazo (opcional)</Label>
                <Input 
                  id="deadline" 
                  type="date"
                  value={newGoalDeadline}
                  onChange={(e) => setNewGoalDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria (opcional)</Label>
                <Input 
                  id="category" 
                  placeholder="Ex: Segurança, Pessoal, Moradia"
                  value={newGoalCategory}
                  onChange={(e) => setNewGoalCategory(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleCreateGoal} disabled={creating}>
                {creating ? "Criando..." : "Criar Meta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ChartCard title="Total em Metas" className="p-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">
              R$ {goals.reduce((sum, goal) => sum + goal.current, 0).toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground">
              de R$ {goals.reduce((sum, goal) => sum + goal.target, 0).toLocaleString("pt-BR")}
            </p>
          </div>
        </ChartCard>
        <ChartCard title="Metas Ativas" className="p-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{goals.length}</p>
            <p className="text-xs text-muted-foreground">metas em andamento</p>
          </div>
        </ChartCard>
        <ChartCard title="Progresso Médio" className="p-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">
              {goals.length > 0
                ? Math.round(
                    goals.reduce((sum, goal) => sum + getProgress(goal.current, goal.target), 0) /
                      goals.length
                  )
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground">conclusão geral</p>
          </div>
        </ChartCard>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <ChartCard title="Nenhuma Meta">
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Você ainda não criou nenhuma meta financeira
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Meta
              </Button>
            </div>
          </ChartCard>
        ) : (
          goals.map((goal) => {
            const progress = getProgress(goal.current, goal.target);
            return (
              <ChartCard key={goal.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {goal.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {goal.category}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Prazo: {goal.deadline || "Sem prazo"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-success tabular-nums">
                          {progress.toFixed(1)}%
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditGoal(goal)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        R$ {goal.current.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-muted-foreground">
                        R$ {goal.target.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      Restam: R$ {(goal.target - goal.current).toLocaleString("pt-BR")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getTimeRemaining(goal.deadline)} restantes
                    </div>
                  </div>
                </div>
              </ChartCard>
            );
          })
        )}
      </div>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Meta Financeira</DialogTitle>
            <DialogDescription>
              Atualize os detalhes da sua meta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome da Meta</Label>
              <Input 
                id="edit-name" 
                placeholder="Ex: Reserva de Emergência"
                value={editGoalName}
                onChange={(e) => setEditGoalName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-target">Valor Objetivo (R$)</Label>
              <Input 
                id="edit-target" 
                type="number" 
                placeholder="50000"
                value={editGoalTarget}
                onChange={(e) => setEditGoalTarget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-current">Valor Atual (R$)</Label>
              <Input 
                id="edit-current" 
                type="number" 
                placeholder="0"
                value={editGoalCurrent}
                onChange={(e) => setEditGoalCurrent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deadline">Prazo (opcional)</Label>
              <Input 
                id="edit-deadline" 
                type="date"
                value={editGoalDeadline}
                onChange={(e) => setEditGoalDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Categoria (opcional)</Label>
              <Input 
                id="edit-category" 
                placeholder="Ex: Segurança, Pessoal, Moradia"
                value={editGoalCategory}
                onChange={(e) => setEditGoalCategory(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleUpdateGoal} disabled={updating}>
              {updating ? "Atualizando..." : "Atualizar Meta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteGoal}
              disabled={deleting}
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

export default Goals;

