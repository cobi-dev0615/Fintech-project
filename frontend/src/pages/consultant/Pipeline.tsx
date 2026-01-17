import { useState } from "react";
import { Plus, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Prospect {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  netWorth?: number;
  notes?: string;
}

const Pipeline = () => {
  const stages = ["Contato Inicial", "Proposta", "Negociação", "Fechamento"];

  const [prospects, setProspects] = useState<Prospect[]>([
    {
      id: "1",
      name: "Roberto Alves",
      email: "roberto@email.com",
      phone: "(11) 99999-9999",
      stage: "Contato Inicial",
      netWorth: 500000,
    },
    {
      id: "2",
      name: "Julia Ferreira",
      email: "julia@email.com",
      phone: "(11) 88888-8888",
      stage: "Proposta",
      netWorth: 750000,
    },
    {
      id: "3",
      name: "Marcos Souza",
      email: "marcos@email.com",
      phone: "(11) 77777-7777",
      stage: "Negociação",
      netWorth: 1200000,
    },
    {
      id: "4",
      name: "Patricia Lima",
      email: "patricia@email.com",
      phone: "(11) 66666-6666",
      stage: "Fechamento",
    },
  ]);

  const moveProspect = (prospectId: string, direction: "left" | "right") => {
    setProspects((prev) =>
      prev.map((p) => {
        if (p.id === prospectId) {
          const currentIndex = stages.indexOf(p.stage);
          if (direction === "right" && currentIndex < stages.length - 1) {
            return { ...p, stage: stages[currentIndex + 1] };
          }
          if (direction === "left" && currentIndex > 0) {
            return { ...p, stage: stages[currentIndex - 1] };
          }
        }
        return p;
      })
    );
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Prospecto
        </Button>
      </div>

      {/* Pipeline Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const stageProspects = getProspectsByStage(stage);
          return (
            <ChartCard
              key={stage}
              title={stage}
              subtitle={`${stageProspects.length} prospecto${stageProspects.length !== 1 ? "s" : ""}`}
              className="min-h-[400px]"
            >
              <div className="space-y-3">
                {stageProspects.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum prospecto neste estágio
                  </div>
                ) : (
                  stageProspects.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-1">
                            {prospect.name}
                          </h4>
                          {prospect.netWorth && (
                            <p className="text-xs text-muted-foreground">
                              Patrimônio: R$ {prospect.netWorth.toLocaleString("pt-BR")}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <span className="sr-only">Menu</span>
                              <span className="text-muted-foreground">⋯</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Phone className="h-4 w-4 mr-2" />
                              Ligar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" />
                              Enviar Email
                            </DropdownMenuItem>
                            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{prospect.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{prospect.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        {stages.indexOf(stage) > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => moveProspect(prospect.id, "left")}
                          >
                            ← Anterior
                          </Button>
                        )}
                        {stages.indexOf(stage) < stages.length - 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => moveProspect(prospect.id, "right")}
                          >
                            Próximo →
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ChartCard>
          );
        })}
      </div>
    </div>
  );
};

export default Pipeline;

