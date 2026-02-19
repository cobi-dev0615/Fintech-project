import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send,
  Trash2,
  ChevronsUpDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { consultantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn, getToastVariantForApiError } from "@/lib/utils";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useTranslation } from "react-i18next";
import ChartCard from "@/components/dashboard/ChartCard";
import { useAuth } from "@/hooks/useAuth";

// --- Types ---

interface Invitation {
  id: string;
  email: string;
  name?: string | null;
  status: string;
  sentAt: string;
  expiresAt: string | null;
}

interface AvailableCustomer {
  id: string;
  email: string;
  name: string | null;
}

interface InvKpiDef {
  title: string;
  value: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

// --- Inline SortableKpiCard ---

function SortableInvKpiCard({ id, kpi }: { id: string; kpi: InvKpiDef }) {
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

const INV_KPI_IDS = ["inv-total", "inv-pending", "inv-accepted", "inv-expired"] as const;

// --- Component ---

const SendInvitations = () => {
  const { t } = useTranslation(['consultant', 'common']);
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState<AvailableCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const invitationsPerPage = 5;
  const { toast } = useToast();

  // --- KPI DnD ---

  const kpiStorageKey = `invitations-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(kpiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (
          parsed.length === INV_KPI_IDS.length &&
          INV_KPI_IDS.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return [...INV_KPI_IDS];
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

  // --- KPI Data ---

  const totalSent = invitations.length;
  const pendingCount = invitations.filter((i) => i.status === "pending" || i.status === "sent").length;
  const acceptedCount = invitations.filter((i) => i.status === "accepted").length;
  const expiredCount = invitations.filter((i) => i.status === "expired").length;

  const kpiMap: Record<string, InvKpiDef> = {
    "inv-total": {
      title: t("consultant:invitations.kpis.totalSent"),
      value: totalSent.toString(),
      changeType: "neutral",
      icon: Send,
      watermark: Send,
    },
    "inv-pending": {
      title: t("consultant:invitations.kpis.pending"),
      value: pendingCount.toString(),
      changeType: "neutral",
      icon: Clock,
      watermark: Clock,
    },
    "inv-accepted": {
      title: t("consultant:invitations.kpis.accepted"),
      value: acceptedCount.toString(),
      changeType: "neutral",
      icon: CheckCircle2,
      watermark: CheckCircle2,
    },
    "inv-expired": {
      title: t("consultant:invitations.kpis.expired"),
      value: expiredCount.toString(),
      changeType: "neutral",
      icon: XCircle,
      watermark: XCircle,
    },
  };

  // --- Data Fetching ---

  const fetchAvailableCustomers = useCallback(async (search?: string) => {
    try {
      setCustomersLoading(true);
      const res = await consultantApi.getAvailableCustomers(search || undefined);
      setAvailableCustomers(res.customers || []);
    } catch (err) {
      setAvailableCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (emailOpen) {
      const timer = setTimeout(() => {
        fetchAvailableCustomers(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [emailOpen, searchQuery, fetchAvailableCustomers]);

  const handleOpenChange = (open: boolean) => {
    setEmailOpen(open);
    if (!open) setSearchQuery("");
  };

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await consultantApi.getInvitations();
      setInvitations(data.invitations);
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Error fetching invitations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvitationsRef = useRef(fetchInvitations);
  fetchInvitationsRef.current = fetchInvitations;

  useWebSocket((message) => {
    if (message.type === "invitation_accepted" || message.type === "invitation_declined") {
      fetchInvitationsRef.current();
    }
  });

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  useEffect(() => {
    const newTotalPages = Math.max(1, Math.ceil(invitations.length / invitationsPerPage) || 1);
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages);
    }
  }, [invitations.length, currentPage, invitationsPerPage]);

  // --- Handlers ---

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      toast({
        title: t('common:error'),
        description: t('consultant:invitations.validation.emailRequired'),
        variant: "warning",
      });
      return;
    }

    try {
      setSending(true);
      const result = await consultantApi.sendInvitation({ email, name: name || undefined, message: message || undefined });
      setInvitations([{ ...result.invitation, expiresAt: (result.invitation as any).expiresAt || null }, ...invitations]);
      setEmail("");
      setName("");
      setMessage("");
      toast({
        title: t('common:success'),
        description: t('consultant:invitations.toast.sent', { email }),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:invitations.sendError'),
        variant: getToastVariantForApiError(err),
      });
      console.error("Error sending invitation:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteInvitation = async () => {
    if (!deleteTarget) return;
    const { id: invitationId } = deleteTarget;
    try {
      setDeleting(invitationId);
      await consultantApi.deleteInvitation(invitationId);
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      setDeleteTarget(null);
      toast({
        title: t('common:success'),
        description: t('consultant:invitations.toast.deleteSuccess'),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t('common:error'),
        description: err?.error || t('consultant:invitations.toast.deleteError'),
        variant: getToastVariantForApiError(err),
      });
      console.error("Error deleting invitation:", err);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusConfig = (status: string) => {
    const config = {
      pending: { icon: Clock, label: t('consultant:invitations.history.status.pending'), className: "bg-yellow-500/10 text-yellow-500" },
      sent: { icon: Mail, label: t('consultant:invitations.history.status.sent'), className: "bg-blue-500/10 text-blue-500" },
      accepted: { icon: CheckCircle2, label: t('consultant:invitations.history.status.accepted'), className: "bg-success/10 text-success" },
      expired: { icon: XCircle, label: t('consultant:invitations.history.status.expired'), className: "bg-destructive/10 text-destructive" },
    };
    return config[status as keyof typeof config] ?? config.pending;
  };

  const getStatusBadge = (status: string) => {
    const { icon: Icon, label, className } = getStatusConfig(status);
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)} title={label}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <Badge className={cn("hidden md:inline-flex", className)}>
          {label}
        </Badge>
      </span>
    );
  };

  const totalInvitations = invitations.length;
  const totalPages = Math.max(1, Math.ceil(totalInvitations / invitationsPerPage) || 1);
  const startIndex = (currentPage - 1) * invitationsPerPage;
  const paginatedInvitations = invitations.slice(startIndex, startIndex + invitationsPerPage);
  const showingFrom = totalInvitations === 0 ? 0 : Math.min(startIndex + 1, totalInvitations);
  const showingTo =
    totalInvitations === 0 ? 0 : Math.min(startIndex + paginatedInvitations.length, totalInvitations);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('common:notAvailable');
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(t('common:locale', { defaultValue: 'pt-BR' }));
    } catch {
      return dateString;
    }
  };

  // --- Render ---

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Grid */}
      <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiOrder.map((id) => (
              <SortableInvKpiCard key={id} id={id} kpi={kpiMap[id]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Invitation Form */}
        <ChartCard
          title={t('consultant:invitations.form.title')}
          subtitle={t('consultant:invitations.form.description')}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('consultant:invitations.form.clientEmail')}</Label>
              <Popover open={emailOpen} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={emailOpen}
                    className="w-full justify-between font-normal h-10"
                  >
                    <span className={cn("truncate", !email && "text-muted-foreground")}>
                      {email || t('consultant:invitations.form.clientEmailPlaceholder')}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('consultant:invitations.form.searchPlaceholder')}
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {customersLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          t('consultant:invitations.form.noCustomersAvailable')
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {availableCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.email} ${customer.name || ""}`}
                            onSelect={() => {
                              setEmail(customer.email);
                              setName(customer.name || "");
                              setEmailOpen(false);
                            }}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate text-sm">{customer.name || customer.email}</span>
                              <span className="text-xs text-muted-foreground truncate">{customer.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('consultant:invitations.form.name')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('consultant:invitations.form.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{t('consultant:invitations.form.message')}</Label>
              <Textarea
                id="message"
                placeholder={t('consultant:invitations.form.messagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            <Button onClick={handleSendInvitation} className="w-full" size="lg" disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {sending ? t('consultant:invitations.form.sending') : t('consultant:invitations.form.sendButton')}
            </Button>
          </div>
        </ChartCard>

        {/* Invitations History */}
        <ChartCard
          title={t('consultant:invitations.history.title')}
          subtitle={t('consultant:invitations.history.subtitle')}
        >
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 w-full rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-muted/20">
                <Mail className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">{t('consultant:invitations.history.empty')}</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">{t('consultant:invitations.history.emptyDesc')}</p>
              </div>
            ) : (
              paginatedInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{invitation.name || invitation.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{invitation.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(invitation.status)}
                      {invitation.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ id: invitation.id, email: invitation.email })}
                          disabled={deleting === invitation.id}
                          title={t('consultant:invitations.history.deleteLabel')}
                          aria-label={t('consultant:invitations.history.deleteLabel')}
                        >
                          {deleting === invitation.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-3 border-t border-border">
                    <span>{t('consultant:invitations.history.sent')}: {formatDate(invitation.sentAt)}</span>
                    <span>{t('consultant:invitations.history.expires')}: {formatDate(invitation.expiresAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalInvitations > 0 && (
            <div className="flex flex-col gap-3 pt-4 mt-4 border-t border-border text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="tabular-nums">
                {t('consultant:invitations.history.showing', { from: showingFrom, to: showingTo, total: totalInvitations })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  aria-label={t('consultant:invitations.history.previousPage')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-foreground font-medium tabular-nums min-w-[4ch] text-center">{currentPage} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages || totalInvitations === 0}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  aria-label={t('consultant:invitations.history.nextPage')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tips */}
      <ChartCard
        title={t('consultant:invitations.tips.title')}
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
            <div>
              <p className="font-semibold text-foreground mb-0.5">{t('consultant:invitations.tips.tip1Title')}</p>
              <p>{t('consultant:invitations.tips.tip1Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
            <div>
              <p className="font-semibold text-foreground mb-0.5">{t('consultant:invitations.tips.tip2Title')}</p>
              <p>{t('consultant:invitations.tips.tip2Desc')}</p>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('consultant:invitations.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('consultant:invitations.deleteDialog.description', {
                email: deleteTarget?.email,
                interpolation: { escapeValue: false }
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deleting}>{t('consultant:invitations.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvitation}
              disabled={!!deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('consultant:invitations.deleteDialog.deleting') : t('consultant:invitations.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SendInvitations;
