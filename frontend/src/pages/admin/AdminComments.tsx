import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Reply,
  Loader2,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
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

const LIMIT_OPTIONS = [5, 10, 20];

const AdminComments = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
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
    } catch (error: unknown) {
      toast({
        title: t('common:error'),
        description: t('admin:comments.errorLoading'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchComments(page, pageSize);
  }, [page, pageSize, fetchComments]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

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
    } catch (error: any) {
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin:comments.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin:comments.subtitle')}
          </p>
        </div>
      </div>

      <ChartCard title={t('admin:comments.cardTitle')}>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin:comments.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {t('common:filters')}
          </Button>
        </div>

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
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredComments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('admin:comments.empty')}
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

        {/* Pagination + page size */}
        {(pagination.total > 0 || pagination.totalPages > 1) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {t('common:showingResults', {
                  from: pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1,
                  to: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total
                })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{t('common:perPage')}</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[100px]" aria-label="Itens por página">
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
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
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
                      onClick={() => setPage(pageNum as number)}
                      className="h-8 w-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        {pagination.total === 0 && pagination.totalPages <= 1 && (
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">{t('common:perPage')}</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[100px]" aria-label="Itens por página">
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
