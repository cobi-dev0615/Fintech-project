import { useState } from "react";
import { Search, TrendingUp, DollarSign, Users, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const prospects: Prospect[] = [
    {
      id: "1",
      name: "João Silva",
      email: "joao@email.com",
      netWorth: 450000,
      stage: "pro",
      engagement: 85,
      lastActivity: "Hoje",
      potential: "high",
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@email.com",
      netWorth: 820000,
      stage: "pro",
      engagement: 92,
      lastActivity: "Hoje",
      potential: "high",
    },
    {
      id: "3",
      name: "Pedro Costa",
      email: "pedro@email.com",
      netWorth: 320000,
      stage: "basic",
      engagement: 65,
      lastActivity: "Ontem",
      potential: "medium",
    },
    {
      id: "4",
      name: "Ana Oliveira",
      email: "ana@email.com",
      netWorth: 1250000,
      stage: "consultant",
      engagement: 98,
      lastActivity: "Hoje",
      potential: "high",
    },
    {
      id: "5",
      name: "Carlos Mendes",
      email: "carlos@email.com",
      netWorth: 280000,
      stage: "free",
      engagement: 45,
      lastActivity: "Há 3 dias",
      potential: "low",
    },
  ];

  const filteredProspects = prospects.filter((prospect) => {
    const matchesSearch =
      prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = filterStage === "all" || prospect.stage === filterStage;
    const matchesPotential = filterPotential === "all" || prospect.potential === filterPotential;
    return matchesSearch && matchesStage && matchesPotential;
  });

  const highPotentialCount = prospects.filter((p) => p.potential === "high").length;
  const totalNetWorth = prospects.reduce((sum, p) => sum + p.netWorth, 0);
  const avgEngagement =
    prospects.reduce((sum, p) => sum + p.engagement, 0) / prospects.length;

  const funnelData = {
    free: prospects.filter((p) => p.stage === "free").length,
    basic: prospects.filter((p) => p.stage === "basic").length,
    pro: prospects.filter((p) => p.stage === "pro").length,
    consultant: prospects.filter((p) => p.stage === "consultant").length,
  };

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
          value={prospects.length.toString()}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStage} onValueChange={setFilterStage}>
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
          <Select value={filterPotential} onValueChange={setFilterPotential}>
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
      <ChartCard title={`${filteredProspects.length} Prospecto${filteredProspects.length !== 1 ? "s" : ""}`}>
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
              {filteredProspects.map((prospect) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

export default DAMAProspecting;

