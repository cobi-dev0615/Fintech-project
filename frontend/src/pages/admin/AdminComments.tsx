import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Reply,
  Loader2,
  CheckCircle2,
  Clock,
  MessageSquare,
  Percent,
  GripVertical,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// --- Types ---

interface CommentKpiDef {
  title: string;
  value: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableCommentKpiCard({ id, kpi }: { id: string; kpi: CommentKpiDef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "z-50 opacity-50 scale-105" : ""}`}
    >
      <button
        type="button"
        className="drag-handle absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/80 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none rounded-md p-1 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="kpi-card relative overflow-hidden h-full">
        <kpi.watermark className="absolute -bottom-3 -right-3 h-24 w-24 text-muted-foreground/[0.06] pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-3 relative z-10">
          <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground truncate">
            {kpi.title}
          </span>
        </div>

        <div className="relative z-10">
          <div className="text-2xl sm:text-[28px] font-bold text-foreground mb-1 tabular-nums tracking-tight leading-none">
            {kpi.value}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Constants ---

const COMMENT_KPI_IDS = ["cmt-total", "cmt-pending", "cmt-replied", "cmt-rate"] as const;
const LIMIT_OPTIONS = [5, 10, 20];

// --- Component ---

const AdminComments = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { user: authUser } = useAuth();
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Reply Modal State
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- KPI DnD ---

  const kpiStorageKey = `admin-comments-kpi-order-${authUser?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === COMMENT_KPI_IDS.length &&
          COMMENT_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...COMMENT_KPI_IDS];
  });

  const kpiSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleKpiDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setKpiOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, moved);
      localStorage.setItem(kpiStorageKey, JSON.stringify(next));
      return next;
    });
  };

  // --- Data fetching ---

  const fetchComments = useCallback(async (p: number, limit: number) => {
    setLoading(true);
    try {
      const response = await adminApi.getComments(p, limit);
      setComments(response.comments);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      });
    } catch {
      toast({
        title: t('common:error'),
        description: t('admin:comments.errorLoading'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchComments(page, pageSize);
  }, [page, pageSize, fetchComments]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // --- KPI Computation ---

  const kpiData = useMemo(() => {
    const totalComments = pagination.total;
    const pendingCount = comments.filter((c) => !c.reply).length;
    const repliedCount = comments.filter((c) => c.reply).length;
    const replyRate = comments.length > 0
      ? Math.round((repliedCount / comments.length) * 100)
      : 0;

    return {
      "cmt-total": {
        title: t('admin:comments.kpis.totalComments'),
        value: String(totalComments),
        changeType: "neutral" as const,
        icon: MessageSquare,
        watermark: MessageSquare,
      },
      "cmt-pending": {
        title: t('admin:comments.kpis.pending'),
        value: String(pendingCount),
        changeType: "negative" as const,
        icon: Clock,
        watermark: Clock,
      },
      "cmt-replied": {
        title: t('admin:comments.kpis.replied'),
        value: String(repliedCount),
        changeType: "positive" as const,
        icon: CheckCircle2,
        watermark: CheckCircle2,
      },
      "cmt-rate": {
        title: t('admin:comments.kpis.replyRate'),
        value: `${replyRate}%`,
        changeType: "positive" as const,
        icon: Percent,
        watermark: Percent,
      },
    };
  }, [comments, pagination.total, t]);

  // --- Helpers ---

  const getPageNumbers = (): (number | string)[] => {
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  const handleOpenReplyModal = (comment: any) => {
    setSelectedComment(comment);
    setReplyText(comment.reply || "");
    setIsReplyModalOpen(true);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedComment) return;

    setIsSubmitting(true);
    try {
      await adminApi.replyToComment(selectedComment.id, replyText);
      toast({
        title: t('common:success'),
        description: t('admin:comments.replySuccess'),
      });
      setIsReplyModalOpen(false);
      fetchComments(page, pageSize);
    } catch {
      toast({
        title: t('common:error'),
        description: t('admin:comments.replyError'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredComments = comments.filter(c =>
    c.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Cards */}
      <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiOrder.map((id) => (
              <SortableCommentKpiCard key={id} id={id} kpi={kpiData[id as keyof typeof kpiData]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Comments Table */}
      <ChartCard
        title={t('admin:comments.title')}
        subtitle={t('admin:comments.subtitle')}
        actions={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t('admin:comments.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-48 text-sm"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin:comments.tableHeaders.user')}</TableHead>
                <TableHead>{t('admin:comments.tableHeaders.title')}</TableHead>
                <TableHead>{t('admin:comments.tableHeaders.comment')}</TableHead>
                <TableHead>{t('admin:comments.tableHeaders.date')}</TableHead>
                <TableHead>{t('admin:comments.tableHeaders.status')}</TableHead>
                <TableHead>{t('admin:comments.tableHeaders.action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <p className="text-muted-foreground">{t('admin:comments.loading')}</p>
                  </TableCell>
                </TableRow>
              ) : filteredComments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">{t('admin:comments.empty')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredComments.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{c.user_name}</p>
                        <p className="text-xs text-muted-foreground">{c.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.title || "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={c.content}>
                      {c.content}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      {c.reply ? (
                        <div className="flex items-center gap-1.5 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-medium">{t('admin:comments.status.replied')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-warning">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-medium">{t('admin:comments.status.pending')}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenReplyModal(c)}
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        {c.reply ? t('admin:comments.viewEdit') : t('admin:comments.reply')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filteredComments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {t('common:showingResults', {
                    from: pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1,
                    to: Math.min(pagination.page * pagination.limit, pagination.total),
                    total: pagination.total
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">
                    {t('common:perPage')}
                  </label>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-9 w-[110px]">
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                  >
                    {t('common:previous')}
                  </Button>
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNum, idx) =>
                      pageNum === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? "default" : "outline"}
                          size="sm"
                          className="min-w-9"
                          onClick={() => setPage(pageNum as number)}
                        >
                          {pageNum}
                        </Button>
                      )
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    {t('common:next')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </ChartCard>

      {/* Reply Modal */}
      <Dialog open={isReplyModalOpen} onOpenChange={setIsReplyModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('admin:comments.replyDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('admin:comments.replyDialog.commentFrom', { name: selectedComment?.user_name })}</p>
              {selectedComment?.title && <p className="text-sm font-bold mb-1">{selectedComment.title}</p>}
              <p className="text-sm text-foreground italic">"{selectedComment?.content}"</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply">{t('admin:comments.replyDialog.yourReply')}</Label>
              <Textarea
                id="reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('admin:comments.replyDialog.placeholder')}
                className="min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReplyModalOpen(false)}>{t('common:cancel')}</Button>
            <Button onClick={handleSendReply} disabled={isSubmitting || !replyText.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Reply className="h-4 w-4 mr-2" />}
              {t('admin:comments.replyDialog.sendReply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminComments;
