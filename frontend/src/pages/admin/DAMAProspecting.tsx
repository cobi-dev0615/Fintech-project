import { useState, useEffect } from "react";
import { Search, TrendingUp, DollarSign, Users, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";

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
  const [loading, setLoading] = useState(true);
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
      setProspects(data.prospects);
      setKpis(data.kpis);
      setFunnelData(data.funnel);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProspects = prospects.filter((prospect) => {
    const matchesStage = filterStage === "all" || prospect.stage === filterStage;
    const matchesPotential = filterPotential === "all" || prospect.potential === filterPotential;
    return matchesStage && matchesPotential;
  });

  const highPotentialCount = kpis.highPotential;
  const totalNetWorth = kpis.totalNetWorth;
  const avgEngagement = kpis.avgEngagement;

  const getStageBadge = (stage: string) => {
    const styles = {
      free: "bg-gray-500/10 text-gray-500",
      basic: "bg-blue-500/10 text-blue-500",
      pro: "bg-purple-500/10 text-purple-500",
      consultant: "bg-orange-500/10 text-orange-500",
    };
    const labels = {
      free: "Free",
      basic: "Basic",
      pro: "Pro",
      consultant: "Consultant",
    };
    return (
      <Badge className={styles[stage as keyof typeof styles]}>
        {labels[stage as keyof typeof labels]}
      </Badge>
    );
  };

  const getPotentialBadge = (potential: string) => {
    const styles = {
      high: "bg-success/10 text-success",
      medium: "bg-warning/10 text-warning",
      low: "bg-muted text-muted-foreground",
    };
    const labels = {
      high: "Alto",
      medium: "Médio",
      low: "Baixo",
    };
    return (
      <Badge className={styles[potential as keyof typeof styles]}>
        {labels[potential as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prospecção DAMA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Identifique usuários elegíveis para conversão
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Alto Potencial"
          value={highPotentialCount.toString()}
          change="prospectos"
          changeType="neutral"
          icon={TrendingUp}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Patrimônio Total"
          value={`R$ ${(totalNetWorth / 1000000).toFixed(1)}M`}
          change=""
          changeType="neutral"
          icon={DollarSign}
          subtitle="sob gestão"
        />
        <ProfessionalKpiCard
          title="Engajamento Médio"
          value={`${avgEngagement.toFixed(0)}%`}
          change=""
          changeType="neutral"
          icon={Users}
          subtitle=""
        />
        <ProfessionalKpiCard
          title="Total Prospectos"
          value={pagination.total.toString()}
          change=""
          changeType="neutral"
          icon={Users}
          subtitle=""
        />
      </div>

      {/* Funnel Summary */}
      <ChartCard title="Funil de Conversão" subtitle="Distribuição por estágio">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(funnelData).map(([stage, count]) => (
            <div key={stage} className="text-center p-4 rounded-lg border border-border">
              <p className="text-2xl font-bold text-foreground mb-1">{count}</p>
              <p className="text-xs text-muted-foreground uppercase">{stage}</p>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Filters */}
      <ChartCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar prospectos..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  fetchProspects();
                }
              }}
              className="pl-9"
            />
          </div>
          <Select value={filterStage} onValueChange={(value) => {
            setFilterStage(value);
            setPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Estágio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estágios</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="consultant">Consultant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPotential} onValueChange={(value) => {
            setFilterPotential(value);
            setPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Potencial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="high">Alto</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="low">Baixo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ChartCard>

      {/* Prospects Table */}
      <ChartCard title={`${pagination.total} Prospecto${pagination.total !== 1 ? "s" : ""}`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Carregando prospectos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Usuário
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Estágio
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Patrimônio
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Engajamento
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Potencial
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Última Atividade
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProspects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum prospecto encontrado
                    </td>
                  </tr>
                ) : (
                  filteredProspects.map((prospect) => (
                <tr
                  key={prospect.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{prospect.name}</p>
                      <p className="text-xs text-muted-foreground">{prospect.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {getStageBadge(prospect.stage)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      R$ {prospect.netWorth.toLocaleString("pt-BR")}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${prospect.engagement}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {prospect.engagement}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {getPotentialBadge(prospect.potential)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">{prospect.lastActivity}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </td>
                </tr>
                ))
                )}
              </tbody>
            </table>
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default DAMAProspecting;

