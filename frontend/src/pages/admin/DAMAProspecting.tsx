import { useState, useEffect } from "react";
import { Search, TrendingUp, DollarSign, Users, ArrowRight, Mail, Phone, Calendar, Target, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface ProspectDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  countryCode: string;
  isActive: boolean;
  birthDate: string | null;
  riskProfile: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    planName: string;
    planPrice: number;
  } | null;
  financialSummary: {
    cash: number;
    investments: number;
    debt: number;
    netWorth: number;
  };
  stats: {
    connections: number;
    goals: number;
    clients: number;
  };
  consultants: Array<{
    id: string;
    name: string;
    email: string;
    relationshipStatus: string;
    relationshipCreatedAt: string;
  }>;
}

const DAMAProspecting = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterPotential, setFilterPotential] = useState<string>("all");
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [prospectDetail, setProspectDetail] = useState<ProspectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
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

  const getRoleBadge = (role: string) => {
    const styles = {
      customer: "bg-blue-500/10 text-blue-500",
      consultant: "bg-purple-500/10 text-purple-500",
      admin: "bg-orange-500/10 text-orange-500",
    };
    const labels = {
      customer: "Cliente",
      consultant: "Consultor",
      admin: "Administrador",
    };
    return (
      <Badge className={styles[role as keyof typeof styles]}>
        {labels[role as keyof typeof labels]}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-success/10 text-success",
      blocked: "bg-destructive/10 text-destructive",
      pending: "bg-warning/10 text-warning",
    };
    const labels = {
      active: "Ativo",
      blocked: "Bloqueado",
      pending: "Pendente",
    };
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const handleViewDetails = async (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setIsDetailDialogOpen(true);
    setDetailLoading(true);
    try {
      const response = await adminApi.getUser(prospect.id);
      setProspectDetail(response.user);
    } catch (error: any) {
      console.error('Failed to fetch prospect details:', error);
      toast({
        title: "Erro",
        description: error?.error || 'Falha ao carregar detalhes do prospecto',
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setIsDetailDialogOpen(false);
    setSelectedProspect(null);
    setProspectDetail(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Prospecção DAMA</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Usuário
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Estágio
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Patrimônio
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Engajamento
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Potencial
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Última Atividade
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card">
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(prospect)}
                    >
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

      {/* Prospect Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={(open) => {
        setIsDetailDialogOpen(open);
        if (!open) {
          handleCloseDetail();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Prospecto</DialogTitle>
            <DialogDescription>
              Informações completas do prospecto selecionado
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Carregando detalhes...</p>
            </div>
          ) : prospectDetail ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Nome</label>
                    <p className="text-sm font-medium">{prospectDetail.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {prospectDetail.email}
                    </p>
                  </div>
                  {prospectDetail.phone && (
                    <div>
                      <label className="text-sm text-muted-foreground">Telefone</label>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {prospectDetail.phone}
                      </p>
                    </div>
                  )}
                  {prospectDetail.birthDate && (
                    <div>
                      <label className="text-sm text-muted-foreground">Data de Nascimento</label>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(prospectDetail.birthDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-muted-foreground">Role</label>
                    <div className="mt-1">
                      {getRoleBadge(prospectDetail.role)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(prospectDetail.status)}
                    </div>
                  </div>
                  {prospectDetail.riskProfile && (
                    <div>
                      <label className="text-sm text-muted-foreground">Perfil de Risco</label>
                      <p className="text-sm font-medium">{prospectDetail.riskProfile}</p>
                    </div>
                  )}
                  {selectedProspect && (
                    <div>
                      <label className="text-sm text-muted-foreground">Potencial</label>
                      <div className="mt-1">
                        {getPotentialBadge(selectedProspect.potential)}
                      </div>
                    </div>
                  )}
                  {selectedProspect && (
                    <div>
                      <label className="text-sm text-muted-foreground">Estágio</label>
                      <div className="mt-1">
                        {getStageBadge(selectedProspect.stage)}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-muted-foreground">Data de Cadastro</label>
                    <p className="text-sm font-medium">
                      {new Date(prospectDetail.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {selectedProspect && (
                    <div>
                      <label className="text-sm text-muted-foreground">Engajamento</label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${selectedProspect.engagement}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {selectedProspect.engagement}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Information */}
              {prospectDetail.subscription && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Assinatura</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Plano</label>
                      <p className="text-sm font-medium">{prospectDetail.subscription.planName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Preço</label>
                      <p className="text-sm font-medium">
                        R$ {(Number(prospectDetail.subscription?.planPrice) || 0).toFixed(2)}/mês
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Status</label>
                      <p className="text-sm font-medium">{prospectDetail.subscription.status}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Próxima Cobrança</label>
                      <p className="text-sm font-medium">
                        {prospectDetail.subscription?.currentPeriodEnd
                          ? new Date(prospectDetail.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Summary */}
              {((prospectDetail.financialSummary?.cash ?? 0) > 0 || (prospectDetail.financialSummary?.investments ?? 0) > 0 || (prospectDetail.financialSummary?.debt ?? 0) > 0) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Resumo Financeiro</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <label className="text-xs text-muted-foreground">Dinheiro</label>
                      </div>
                      <p className="text-lg font-semibold">
                        R$ {(prospectDetail.financialSummary?.cash ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <label className="text-xs text-muted-foreground">Investimentos</label>
                      </div>
                      <p className="text-lg font-semibold">
                        R$ {(prospectDetail.financialSummary?.investments ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <label className="text-xs text-muted-foreground">Dívidas</label>
                      </div>
                      <p className="text-lg font-semibold text-destructive">
                        R$ {(prospectDetail.financialSummary?.debt ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-primary/5">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <label className="text-xs text-muted-foreground">Patrimônio Líquido</label>
                      </div>
                      <p className="text-lg font-semibold text-primary">
                        R$ {(prospectDetail.financialSummary?.netWorth ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <label className="text-xs text-muted-foreground">Conexões</label>
                    </div>
                    <p className="text-2xl font-semibold">{prospectDetail.stats.connections}</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <label className="text-xs text-muted-foreground">Metas</label>
                    </div>
                    <p className="text-2xl font-semibold">{prospectDetail.stats.goals}</p>
                  </div>
                  {prospectDetail.role === 'consultant' && (
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <label className="text-xs text-muted-foreground">Clientes</label>
                      </div>
                      <p className="text-2xl font-semibold">{prospectDetail.stats.clients}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Consultants (if customer) */}
              {prospectDetail.role === 'customer' && prospectDetail.consultants.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Consultores Associados</h3>
                  <div className="space-y-2">
                    {prospectDetail.consultants.map((consultant) => (
                      <div key={consultant.id} className="p-3 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{consultant.name}</p>
                            <p className="text-xs text-muted-foreground">{consultant.email}</p>
                          </div>
                          <Badge variant="outline">{consultant.relationshipStatus}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Associado desde {new Date(consultant.relationshipCreatedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default DAMAProspecting;

