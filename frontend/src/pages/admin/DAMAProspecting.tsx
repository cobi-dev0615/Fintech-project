import { useState, useEffect } from "react";
import { Search, TrendingUp, DollarSign, Users, ArrowRight, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Prospect {
  id: string;
  name: string;
  email: string;
  netWorth: number;
  stage: "free" | "basic" | "pro" | "consultant";
  engagement: number;
  lastActivity: string;
  potential: "high" | "medium" | "low";
}

const DAMAProspecting = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterPotential, setFilterPotential] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [kpis, setKpis] = useState({
    highPotential: 0,
    totalNetWorth: 0,
    avgEngagement: 0,
    total: 0,
  });
  const [funnelData, setFunnelData] = useState({
    free: 0,
    basic: 0,
    pro: 0,
    consultant: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchProspects();
  }, [searchQuery, filterStage, filterPotential, page]);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getProspecting({
        search: searchQuery || undefined,
        stage: filterStage !== "all" ? filterStage : undefined,
        potential: filterPotential !== "all" ? filterPotential : undefined,
        page,
        limit: 20,
      });
      setProspects((data.prospects || []) as Prospect[]);
      setKpis(data.kpis ?? { highPotential: 0, totalNetWorth: 0, avgEngagement: 0, total: 0 });
      setFunnelData(data.funnel ?? { free: 0, basic: 0, pro: 0, consultant: 0 });
      setPagination(data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      console.error("Failed to fetch prospects:", err);
      setProspects([]);
    } finally {
      setLoading(false);
    }
  };

  const getStageBadge = (stage: string) => {
    const styles: Record<string, string> = {
      free: "bg-muted text-muted-foreground",
      basic: "bg-blue-500/10 text-blue-500",
      pro: "bg-primary/10 text-primary",
      consultant: "bg-emerald-500/10 text-emerald-500",
    };
    const labels: Record<string, string> = {
      free: "Free",
      basic: "Basic",
      pro: "Pro",
      consultant: "Consultor",
    };
    return <Badge className={styles[stage] ?? styles.free}>{labels[stage] ?? stage}</Badge>;
  };

  const getPotentialBadge = (potential: string) => {
    const styles: Record<string, string> = {
      high: "bg-success/10 text-success",
      medium: "bg-amber-500/10 text-amber-500",
      low: "bg-muted text-muted-foreground",
    };
    const labels: Record<string, string> = {
      high: "Alto",
      medium: "Médio",
      low: "Baixo",
    };
    return <Badge className={styles[potential] ?? styles.low}>{labels[potential] ?? potential}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prospecção DAMA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe prospectos por estágio e potencial
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Total Prospectos"
          value={pagination.total.toString()}
          change={`página ${pagination.page}`}
          changeType="neutral"
          icon={Users}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Alto Potencial"
          value={kpis.highPotential.toString()}
          change=""
          changeType="positive"
          icon={Target}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Patrimônio Total"
          value={`R$ ${(kpis.totalNetWorth ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change=""
          changeType="neutral"
          icon={DollarSign}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Engajamento Médio"
          value={`${(kpis.avgEngagement ?? 0).toFixed(0)}%`}
          change=""
          changeType="neutral"
          icon={TrendingUp}
          subtitle=""
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(funnelData).map(([stage, count]) => (
          <div key={stage} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground uppercase mt-1">{stage}</p>
          </div>
        ))}
      </div>

      <ChartCard title={`${pagination.total} Prospecto${pagination.total !== 1 ? "s" : ""}`}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estágios</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="consultant">Consultor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPotential} onValueChange={setFilterPotential}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Potencial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo potencial</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Carregando...</div>
          ) : prospects.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Nenhum prospecto encontrado
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-foreground">Nome</th>
                    <th className="text-left p-3 font-medium text-foreground">E-mail</th>
                    <th className="text-left p-3 font-medium text-foreground">Estágio</th>
                    <th className="text-left p-3 font-medium text-foreground">Potencial</th>
                    <th className="text-right p-3 font-medium text-foreground">Patrimônio</th>
                    <th className="text-right p-3 font-medium text-foreground">Engajamento</th>
                    <th className="p-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3 font-medium text-foreground">{p.name}</td>
                      <td className="p-3 text-muted-foreground">{p.email}</td>
                      <td className="p-3">{getStageBadge(p.stage)}</td>
                      <td className="p-3">{getPotentialBadge(p.potential)}</td>
                      <td className="p-3 text-right tabular-nums">
                        R$ {(p.netWorth ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right">{p.engagement ?? 0}%</td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProspect(p);
                            setDetailOpen(true);
                          }}
                          aria-label="Ver detalhes"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </ChartCard>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do prospecto</DialogTitle>
          </DialogHeader>
          {selectedProspect && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Nome:</span> {selectedProspect.name}</p>
              <p><span className="text-muted-foreground">E-mail:</span> {selectedProspect.email}</p>
              <p><span className="text-muted-foreground">Estágio:</span> {getStageBadge(selectedProspect.stage)}</p>
              <p><span className="text-muted-foreground">Potencial:</span> {getPotentialBadge(selectedProspect.potential)}</p>
              <p><span className="text-muted-foreground">Patrimônio:</span> R$ {(selectedProspect.netWorth ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p><span className="text-muted-foreground">Engajamento:</span> {selectedProspect.engagement ?? 0}%</p>
              <p><span className="text-muted-foreground">Última atividade:</span> {selectedProspect.lastActivity || "—"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DAMAProspecting;
