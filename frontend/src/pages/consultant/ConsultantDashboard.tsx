import { Users, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Link } from "react-router-dom";

const ConsultantDashboard = () => {
  const recentTasks = [
    { id: "1", client: "João Silva", task: "Revisar portfólio", dueDate: "Hoje", priority: "high" },
    { id: "2", client: "Maria Santos", task: "Preparar relatório", dueDate: "Amanhã", priority: "medium" },
    { id: "3", client: "Pedro Costa", task: "Seguimento de proposta", dueDate: "20/02", priority: "low" },
  ];

  const pipelineData = [
    { stage: "Contato Inicial", count: 5 },
    { stage: "Proposta", count: 3 },
    { stage: "Negociação", count: 2 },
    { stage: "Fechamento", count: 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel do Consultor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral de clientes e tarefas
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Total de Clientes"
          value="24"
          change="+3 este mês"
          changeType="positive"
          icon={Users}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Patrimônio Total"
          value="R$ 2.4M"
          change="+8,2%"
          changeType="positive"
          icon={TrendingUp}
          subtitle="sob gestão"
        />
        <ProfessionalKpiCard
          title="Tarefas Pendentes"
          value={recentTasks.length.toString()}
          change=""
          changeType="neutral"
          icon={Calendar}
          subtitle="para hoje"
        />
        <ProfessionalKpiCard
          title="Prospectos"
          value="11"
          change=""
          changeType="neutral"
          icon={AlertCircle}
          subtitle="no pipeline"
        />
      </div>

      {/* Pipeline and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Pipeline de Prospecção" subtitle="Status dos prospectos">
          <div className="space-y-4">
            {pipelineData.map((stage, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{stage.stage}</span>
                  <span className="text-sm text-muted-foreground">{stage.count}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(stage.count / 11) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Link to="/consultant/pipeline" className="text-sm text-primary hover:underline">
              Ver pipeline completo →
            </Link>
          </div>
        </ChartCard>

        <ChartCard title="Próximas Tarefas" subtitle="Ações pendentes">
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.task}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.client} • {task.dueDate}
                  </p>
                </div>
                <span
                  className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
                    task.priority === "high"
                      ? "bg-destructive/10 text-destructive"
                      : task.priority === "medium"
                      ? "bg-warning/10 text-warning"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Link to="/consultant/tasks" className="text-sm text-primary hover:underline">
              Ver todas as tarefas →
            </Link>
          </div>
        </ChartCard>
      </div>

      {/* Quick Actions */}
      <ChartCard title="Ações Rápidas">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/consultant/clients">
            <div className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <Users className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">Ver Clientes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Gerencie sua base de clientes
              </p>
            </div>
          </Link>
          <Link to="/consultant/clients/new">
            <div className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <Users className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">Convidar Cliente</p>
              <p className="text-xs text-muted-foreground mt-1">
                Envie um convite para novo cliente
              </p>
            </div>
          </Link>
          <Link to="/consultant/pipeline">
            <div className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <TrendingUp className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">Pipeline</p>
              <p className="text-xs text-muted-foreground mt-1">
                Gerencie seus prospectos
              </p>
            </div>
          </Link>
        </div>
      </ChartCard>
    </div>
  );
};

export default ConsultantDashboard;

