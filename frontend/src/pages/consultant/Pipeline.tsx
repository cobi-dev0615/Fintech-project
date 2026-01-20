import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Prospect {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  notes?: string;
}

const Pipeline = () => {
  const stageOrder = ['lead', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
  const stageLabels: Record<string, string> = {
    'lead': 'Contato Inicial',
    'contacted': 'Contatado',
    'meeting': 'Reunião',
    'proposal': 'Proposta',
    'won': 'Fechamento',
    'lost': 'Perdido',
  };

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['consultant', 'pipeline'],
    queryFn: () => consultantApi.getPipeline(),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });

  const prospects = data?.prospects || [];
  const loading = isLoading;

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
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
    } catch (err: any) {
      console.error("Error updating prospect stage:", err);
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['consultant', 'pipeline'] });
      toast({
        title: "Erro",
        description: err?.error || "Erro ao atualizar estágio",
        variant: "destructive",
      });
    }
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

      {loading && !prospects.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-destructive">{(error as any)?.error || "Erro ao carregar pipeline"}</p>
        </div>
      ) : (
        /* Pipeline Kanban */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stageOrder.map((stage) => {
            const stageProspects = getProspectsByStage(stage);
            return (
              <ChartCard
                key={stage}
                title={stageLabels[stage] || stage}
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
                          {prospect.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {prospect.notes}
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
                        {stageOrder.indexOf(stage) > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => moveProspect(prospect.id, "left")}
                          >
                            ← Anterior
                          </Button>
                        )}
                        {stageOrder.indexOf(stage) < stageOrder.length - 1 && stage !== 'won' && stage !== 'lost' && (
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
      )}
    </div>
  );
};

export default Pipeline;

