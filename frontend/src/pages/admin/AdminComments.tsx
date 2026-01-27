import { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Reply, 
  Loader2, 
  MoreHorizontal,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const AdminComments = () => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Reply Modal State
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = async (page: number) => {
    setLoading(true);
    try {
      const response = await adminApi.getComments(page);
      setComments(response.comments);
      setPagination({
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar comentários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments(1);
  }, []);

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
        title: "Sucesso",
        description: "Resposta enviada com sucesso",
      });
      setIsReplyModalOpen(false);
      fetchComments(pagination.page);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao enviar resposta",
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
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Comentários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Responda e gerencie o feedback dos usuários
          </p>
        </div>
      </div>

      <ChartCard title="Comentários dos Usuários">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou conteúdo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Comentário</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ação</TableHead>
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
                    Nenhum comentário encontrado
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
                      {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      {c.reply ? (
                        <div className="flex items-center gap-1.5 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-medium">Respondido</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-warning">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-medium">Pendente</span>
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
                        {c.reply ? "Ver/Editar" : "Responder"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => pagination.page > 1 && fetchComments(pagination.page - 1)}
                    className={cn(pagination.page === 1 && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink 
                      onClick={() => fetchComments(p)}
                      isActive={pagination.page === p}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => pagination.page < pagination.totalPages && fetchComments(pagination.page + 1)}
                    className={cn(pagination.page === pagination.totalPages && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </ChartCard>

      {/* Reply Modal */}
      <Dialog open={isReplyModalOpen} onOpenChange={setIsReplyModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Responder Comentário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Comentário de {selectedComment?.user_name}</p>
              {selectedComment?.title && <p className="text-sm font-bold mb-1">{selectedComment.title}</p>}
              <p className="text-sm text-foreground italic">"{selectedComment?.content}"</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply">Sua Resposta</Label>
              <Textarea 
                id="reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Digite sua resposta aqui..."
                className="min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReplyModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendReply} disabled={isSubmitting || !replyText.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Reply className="h-4 w-4 mr-2" />}
              Enviar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminComments;
