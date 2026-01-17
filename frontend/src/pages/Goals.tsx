import { useState } from "react";
import { Target, Plus, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Progress } from "@/components/ui/progress";

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  category: string;
}

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      name: "Reserva de Emergência",
      target: 50000,
      current: 35000,
      deadline: "12/2024",
      category: "Segurança",
    },
    {
      id: "2",
      name: "Viagem para Europa",
      target: 15000,
      current: 8500,
      deadline: "06/2024",
      category: "Pessoal",
    },
    {
      id: "3",
      name: "Entrada do Apartamento",
      target: 200000,
      current: 125000,
      deadline: "12/2025",
      category: "Moradia",
    },
  ]);

  const getProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getTimeRemaining = (deadline: string) => {
    // Simple calculation - in real app, use proper date parsing
    return "8 meses";
  };

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
        <Dialog>
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
                <Input id="name" placeholder="Ex: Reserva de Emergência" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Valor Objetivo (R$)</Label>
                <Input id="target" type="number" placeholder="50000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Prazo</Label>
                <Input id="deadline" type="date" />
              </div>
              <Button className="w-full">Criar Meta</Button>
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
              {Math.round(
                goals.reduce((sum, goal) => sum + getProgress(goal.current, goal.target), 0) /
                  goals.length
              )}%
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
              <Button>
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
                    <div>
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
                          Prazo: {goal.deadline}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-success tabular-nums">
                        {progress.toFixed(1)}%
                      </p>
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
    </div>
  );
};

export default Goals;

