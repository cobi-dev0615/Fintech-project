import { useState, useEffect } from "react";
import { Search, TrendingUp, DollarSign, Users, ArrowRight, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
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

const LIMIT_OPTIONS = [5, 10, 20];

const DAMAProspecting = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterPotential, setFilterPotential] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterStage, filterPotential]);

  // Reset to page 1 when page size changes
  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getProspecting({
        search: searchQuery || undefined,
        stage: filterStage !== "all" ? filterStage : undefined,
        potential: filterPotential !== "all" ? filterPotential : undefined,
        page,
        limit: pageSize,
      });
      setProspects((data.prospects || []) as Prospect[]);
      setKpis(data.kpis ?? { highPotential: 0, totalNetWorth: 0, avgEngagement: 0, total: 0 });
      setFunnelData(data.funnel ?? { free: 0, basic: 0, pro: 0, consultant: 0 });
      setPagination(data.pagination ?? { page: 1, limit: pageSize, total: 0, totalPages: 0 });
    } catch (err) {
      console.error("Failed to fetch prospects:", err);
      setProspects([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced fetch on page, pageSize, search, or filter change
  useEffect(() => {
    const timer = setTimeout(() => fetchProspects(), 300);
    return () => clearTimeout(timer);
  }, [page, pageSize, searchQuery, filterStage, filterPotential]);

  const getStageBadge = (stage: string) => {
    const styles: Record<string, string> = {
      free: "bg-muted text-muted-foreground",
      basic: "bg-blue-500/10 text-blue-500",
      pro: "bg-primary/10 text-primary",
      consultant: "bg-emerald-500/10 text-emerald-500",
    };
    const getStageLabel = (s: string) => {
      if (s === 'free') return t('admin:prospecting.stages.free');
      if (s === 'basic') return t('admin:prospecting.stages.basic');
      if (s === 'pro') return t('admin:prospecting.stages.pro');
      if (s === 'consultant') return t('admin:prospecting.stages.consultant');
      return s;
    };
    return <Badge className={styles[stage] ?? styles.free}>{getStageLabel(stage)}</Badge>;
  };

  const getPotentialBadge = (potential: string) => {
    const styles: Record<string, string> = {
      high: "bg-success/10 text-success",
      medium: "bg-amber-500/10 text-amber-500",
      low: "bg-muted text-muted-foreground",
    };
    const getPotentialLabel = (p: string) => {
      if (p === 'high') return t('admin:prospecting.potential.high');
      if (p === 'medium') return t('admin:prospecting.potential.medium');
      if (p === 'low') return t('admin:prospecting.potential.low');
      return p;
    };
    return <Badge className={styles[potential] ?? styles.low}>{getPotentialLabel(potential)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin:prospecting.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin:prospecting.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title={t('admin:prospecting.kpis.totalProspects')}
          value={pagination.total.toString()}
          change={t('admin:prospecting.kpis.page', { page: pagination.page })}
          changeType="neutral"
          icon={Users}
          subtitle=""
        />
        <ProfessionalKpiCard
          title={t('admin:prospecting.kpis.highPotential')}
          value={kpis.highPotential.toString()}
          change=""
          changeType="positive"
          icon={Target}
          subtitle=""
        />
        <ProfessionalKpiCard
          title={t('admin:prospecting.kpis.totalNetWorth')}
          value={`R$ ${(kpis.totalNetWorth ?? 0).toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}`}
          change=""
          changeType="neutral"
          icon={DollarSign}
          subtitle=""
        />
        <ProfessionalKpiCard
          title={t('admin:prospecting.kpis.avgEngagement')}
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
            <p className="text-xs text-muted-foreground uppercase mt-1">
              {stage === 'free' ? t('admin:prospecting.stages.free') :
               stage === 'basic' ? t('admin:prospecting.stages.basic') :
               stage === 'pro' ? t('admin:prospecting.stages.pro') :
               stage === 'consultant' ? t('admin:prospecting.stages.consultant') :
               stage}
            </p>
          </div>
        ))}
      </div>

      <ChartCard title={`${pagination.total} ${pagination.total === 1 ? t('admin:prospecting.prospect') : t('admin:prospecting.prospects')}`}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin:prospecting.searchPlaceholder')}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder={t('admin:prospecting.filters.stage')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin:prospecting.filters.allStages')}</SelectItem>
                <SelectItem value="free">{t('admin:prospecting.stages.free')}</SelectItem>
                <SelectItem value="basic">{t('admin:prospecting.stages.basic')}</SelectItem>
                <SelectItem value="pro">{t('admin:prospecting.stages.pro')}</SelectItem>
                <SelectItem value="consultant">{t('admin:prospecting.stages.consultant')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPotential} onValueChange={setFilterPotential}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder={t('admin:prospecting.filters.potential')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin:prospecting.filters.allPotential')}</SelectItem>
                <SelectItem value="high">{t('admin:prospecting.potential.high')}</SelectItem>
                <SelectItem value="medium">{t('admin:prospecting.potential.medium')}</SelectItem>
                <SelectItem value="low">{t('admin:prospecting.potential.low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">{t('common:loading')}</div>
          ) : prospects.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {t('admin:prospecting.empty')}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-foreground">{t('admin:prospecting.tableHeaders.name')}</th>
                    <th className="text-left p-3 font-medium text-foreground">{t('admin:prospecting.tableHeaders.email')}</th>
                    <th className="text-left p-3 font-medium text-foreground">{t('admin:prospecting.tableHeaders.stage')}</th>
                    <th className="text-left p-3 font-medium text-foreground">{t('admin:prospecting.tableHeaders.potential')}</th>
                    <th className="text-right p-3 font-medium text-foreground">{t('admin:prospecting.tableHeaders.netWorth')}</th>
                    <th className="text-right p-3 font-medium text-foreground">{t('admin:prospecting.tableHeaders.engagement')}</th>
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
                        R$ {(p.netWorth ?? 0).toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}
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
                          aria-label={t('admin:prospecting.viewDetails')}
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

          {/* Pagination + page size */}
          {prospects.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {t('common:showingResults', {
                      from: ((page - 1) * pagination.limit) + 1,
                      to: Math.min(page * pagination.limit, pagination.total),
                      total: pagination.total
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <label htmlFor="prospects-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
                      {t('common:perPage')}
                    </label>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger id="prospects-per-page" className="h-9 w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIMIT_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, Math.max(1, pagination.totalPages)) }, (_, i) => {
                      let pageNum: number;
                      const totalP = Math.max(1, pagination.totalPages);
                      if (totalP <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalP - 2) {
                        pageNum = totalP - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setPage(pageNum)}
                          disabled={loading}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage((p) => Math.min(Math.max(1, pagination.totalPages), p + 1))}
                      disabled={page >= Math.max(1, pagination.totalPages) || loading}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ChartCard>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin:prospecting.detailDialog.title')}</DialogTitle>
          </DialogHeader>
          {selectedProspect && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">{t('admin:prospecting.detailDialog.name')}:</span> {selectedProspect.name}</p>
              <p><span className="text-muted-foreground">{t('admin:prospecting.detailDialog.email')}:</span> {selectedProspect.email}</p>
              <p><span className="text-muted-foreground">{t('admin:prospecting.detailDialog.stage')}:</span> {getStageBadge(selectedProspect.stage)}</p>
              <p><span className="text-muted-foreground">{t('admin:prospecting.detailDialog.potential')}:</span> {getPotentialBadge(selectedProspect.potential)}</p>
              <p><span className="text-muted-foreground">{t('admin:prospecting.detailDialog.netWorth')}:</span> R$ {(selectedProspect.netWorth ?? 0).toLocaleString(i18n.language === 'pt-BR' || i18n.language === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}</p>
              <p><span className="text-muted-foreground">{t('admin:prospecting.detailDialog.engagement')}:</span> {selectedProspect.engagement ?? 0}%</p>
              <p><span className="text-muted-foreground">{t('admin:prospecting.detailDialog.lastActivity')}:</span> {selectedProspect.lastActivity || "—"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DAMAProspecting;
