import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { getToastVariantForApiError } from "@/lib/utils";
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Mail,
  Clock,
  AlertCircle,
  Copy,
  Users,
  Percent,
  Wallet,
  Unlink,
  GripVertical,
  TrendingUp,
  TrendingDown,
  Link2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
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
import ChartCard from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { customerApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface Invitation {
  id: string;
  consultantId: string;
  consultantName: string;
  consultantEmail: string;
  status: string;
  sentAt: string;
  expiresAt: string | null;
}

interface InvitedUser {
  id: string;
  name: string;
  email: string;
  status: string;
  registeredAt: string;
}

// --- KPI Card types & component ---

interface InvKpiDef {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  watermark: LucideIcon;
}

function SortableInvKpiCard({ id, kpi }: { id: string; kpi: InvKpiDef }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
          {kpi.change && kpi.changeType !== "neutral" && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`flex items-center gap-0.5 ${
                  kpi.changeType === "positive"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {kpi.changeType === "positive" ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-semibold tabular-nums">
                  {kpi.change}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- KPI IDs ---

const INV_KPI_IDS = [
  "inv-pending",
  "inv-connected",
  "inv-friends",
  "inv-referral",
] as const;

// --- Main component ---

const Invitations = () => {
  const { t, i18n } = useTranslation(["invitations", "common"]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<Invitation | null>(null);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [consultantToDisconnect, setConsultantToDisconnect] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [togglingShare, setTogglingShare] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string>("");
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [referralLoading, setReferralLoading] = useState(true);
  const [invitedPage, setInvitedPage] = useState(1);
  const INVITED_PER_PAGE = 3;

  const dateLocale =
    i18n.language === "pt-BR" || i18n.language === "pt" ? ptBR : enUS;

  // --- KPI drag order ---
  const kpiStorageKey = `inv-kpi-order-${user?.id || "guest"}`;
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
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  useEffect(() => {
    const loadReferral = async () => {
      try {
        setReferralLoading(true);
        const [linkRes, usersRes] = await Promise.all([
          customerApi.getReferralLink().catch(() => ({ link: "" })),
          customerApi
            .getInvitedUsers()
            .catch(() => ({ invitedUsers: [], invitedCount: 0 })),
        ]);
        setReferralLink(linkRes.link || "");
        setInvitedUsers(usersRes.invitedUsers || []);
      } catch {
        setReferralLink("");
        setInvitedUsers([]);
      } finally {
        setReferralLoading(false);
      }
    };
    loadReferral();
  }, []);

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: t("referral.linkCopied"),
      description: t("referral.linkCopiedDesc"),
      variant: "success",
    });
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["customer", "invitations"],
    queryFn: () => customerApi.getInvitations(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: consultantsData } = useQuery({
    queryKey: ["customer", "consultants"],
    queryFn: () => customerApi.getConsultants(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const invitations = data?.invitations || [];
  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "pending"
  );
  const acceptedConsultants = consultantsData?.consultants || [];
  const hasConsultantWhoInvitedMe =
    pendingInvitations.length > 0 || acceptedConsultants.length > 0;
  const hasExpiredInvitations = invitations.some((inv) => {
    if (!inv.expiresAt) return false;
    return new Date(inv.expiresAt) < new Date();
  });

  useWebSocket((message) => {
    if (message.type === "consultant_invitation") {
      queryClient.invalidateQueries({
        queryKey: ["customer", "invitations"],
      });
    }
  });

  // --- KPI data ---

  const REFERRAL_DISCOUNT_THRESHOLD = 10;
  const referralProgress = Math.min(
    invitedUsers.length,
    REFERRAL_DISCOUNT_THRESHOLD
  );
  const referralProgressPct =
    (referralProgress / REFERRAL_DISCOUNT_THRESHOLD) * 100;

  const kpiData: Record<string, InvKpiDef> = {
    "inv-pending": {
      title: t("kpi.pendingInvitations"),
      value: String(pendingInvitations.length),
      change:
        pendingInvitations.length > 0
          ? `${pendingInvitations.length} awaiting`
          : undefined,
      changeType: pendingInvitations.length > 0 ? "negative" : "neutral",
      icon: Clock,
      watermark: UserPlus,
    },
    "inv-connected": {
      title: t("kpi.connectedConsultants"),
      value: String(acceptedConsultants.length),
      change:
        acceptedConsultants.length > 0
          ? `${acceptedConsultants.length} active`
          : undefined,
      changeType: acceptedConsultants.length > 0 ? "positive" : "neutral",
      icon: UserCheck,
      watermark: Users,
    },
    "inv-friends": {
      title: t("kpi.invitedFriends"),
      value: String(invitedUsers.length),
      change:
        invitedUsers.length > 0 ? `+${invitedUsers.length}` : undefined,
      changeType: invitedUsers.length > 0 ? "positive" : "neutral",
      icon: Users,
      watermark: Mail,
    },
    "inv-referral": {
      title: t("kpi.referralProgress"),
      value: `${referralProgress}/${REFERRAL_DISCOUNT_THRESHOLD}`,
      change: `${referralProgressPct.toFixed(0)}%`,
      changeType: referralProgressPct >= 100 ? "positive" : "neutral",
      icon: Percent,
      watermark: Link2,
    },
  };

  // --- Actions ---

  const handleAccept = async (invitation: Invitation) => {
    try {
      await customerApi.acceptInvitation(invitation.id);
      queryClient.invalidateQueries({
        queryKey: ["customer", "invitations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer", "consultants"],
      });
      toast({
        title: t("toast.accepted"),
        description: t("toast.acceptedDesc", {
          name: invitation.consultantName,
        }),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t("common:error"),
        description: t("toast.acceptError"),
        variant: getToastVariantForApiError(err),
      });
    }
  };

  const handleDecline = async () => {
    if (!selectedInvitation) return;
    try {
      await customerApi.declineInvitation(selectedInvitation.id);
      queryClient.invalidateQueries({
        queryKey: ["customer", "invitations"],
      });
      setDeclineDialogOpen(false);
      setSelectedInvitation(null);
      toast({
        title: t("toast.declined"),
        description: t("toast.declinedDesc"),
      });
    } catch (err: any) {
      toast({
        title: t("common:error"),
        description: t("toast.declineError"),
        variant: getToastVariantForApiError(err),
      });
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt);
    const now = new Date();
    if (expires < now) return null;
    return formatDistanceToNow(expires, {
      addSuffix: true,
      locale: dateLocale,
    });
  };

  const handleDisconnect = async () => {
    if (!consultantToDisconnect) return;
    try {
      setDisconnecting(true);
      await customerApi.disconnectConsultant(consultantToDisconnect.id);
      queryClient.invalidateQueries({
        queryKey: ["customer", "consultants"],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer", "invitations"],
      });
      setDisconnectDialogOpen(false);
      setConsultantToDisconnect(null);
      toast({
        title: t("toast.disconnected"),
        description: t("toast.disconnectedDesc"),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t("common:error"),
        description: t("toast.disconnectError"),
        variant: getToastVariantForApiError(err),
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleWalletShare = async (
    linkId: string,
    currentValue: boolean
  ) => {
    try {
      setTogglingShare(linkId);
      await customerApi.updateConsultantWalletShare(linkId, !currentValue);
      queryClient.invalidateQueries({
        queryKey: ["customer", "consultants"],
      });
      toast({
        title: !currentValue
          ? t("toast.walletShared")
          : t("toast.walletUnshared"),
        description: !currentValue
          ? t("toast.walletSharedDesc")
          : t("toast.walletUnsharedDesc"),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t("common:error"),
        description: t("toast.walletError"),
        variant: getToastVariantForApiError(err),
      });
    } finally {
      setTogglingShare(null);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "registered") return t("referral.statusRegistered");
    if (status === "pending_approval")
      return t("referral.statusPendingApproval");
    return t("referral.statusInactive");
  };

  // --- Render ---

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6">
      {/* KPI Cards Row — Draggable */}
      <DndContext
        sensors={kpiSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleKpiDragEnd}
      >
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpiOrder.map((id) => {
              const kpi = kpiData[id];
              if (!kpi) return null;
              return <SortableInvKpiCard key={id} id={id} kpi={kpi} />;
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Alerts */}
      {hasExpiredInvitations && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("expiredAlert")}</AlertDescription>
        </Alert>
      )}

      {/* Row 1: Consultants + About */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Consultant(s) who invited me */}
        <div className="lg:col-span-7">
          <ChartCard
            title={t("consultantsSection.title")}
            subtitle={
              hasConsultantWhoInvitedMe
                ? undefined
                : t("consultantsSection.noConsultant")
            }
          >
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !hasConsultantWhoInvitedMe ? (
              <p className="text-sm text-muted-foreground py-2">
                {t("consultantsSection.whenConsultant")}
              </p>
            ) : (
              <ul className="space-y-3">
                {pendingInvitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">
                          {inv.consultantName}
                        </span>
                        <span className="text-muted-foreground text-sm ml-2 truncate block sm:inline">
                          {inv.consultantEmail}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {t("consultantsSection.awaitingResponse")}
                    </Badge>
                  </li>
                ))}
                {acceptedConsultants.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-muted/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-full bg-primary/10 p-2 shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {c.email}
                        </p>
                      </div>
                      <Badge
                        variant="default"
                        className="shrink-0 hidden sm:inline-flex"
                      >
                        {t("consultantsSection.connected")}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pl-11 sm:pl-0">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`share-${c.id}`}
                          checked={c.canViewAll !== false}
                          disabled={togglingShare === c.id}
                          onCheckedChange={() =>
                            handleToggleWalletShare(c.id, c.canViewAll !== false)
                          }
                        />
                        <Label
                          htmlFor={`share-${c.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {t("consultantsSection.shareWallet")}
                        </Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                        onClick={() => {
                          setConsultantToDisconnect({ id: c.id, name: c.name });
                          setDisconnectDialogOpen(true);
                        }}
                      >
                        <Unlink className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">
                          {t("consultantsSection.disconnect")}
                        </span>
                      </Button>
                      <Badge className="sm:hidden shrink-0">
                        {t("consultantsSection.connected")}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>

        {/* About Invitations — sidebar */}
        <div className="lg:col-span-5">
          <ChartCard title={t("aboutSection.title")}>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {t("aboutSection.whatAre")}
                  </div>
                  <p>{t("aboutSection.whatAreDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {t("aboutSection.validity")}
                  </div>
                  <p>{t("aboutSection.validityDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {t("aboutSection.privacy")}
                  </div>
                  <p>{t("aboutSection.privacyDesc")}</p>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Row 2: Pending Invitations + Referral */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pending Invitations */}
        <div className="lg:col-span-7">
          <ChartCard
            title={t("pendingSection.title")}
            subtitle={
              pendingInvitations.length > 0
                ? t("pendingSection.subtitle", {
                    count: pendingInvitations.length,
                  })
                : undefined
            }
          >
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive">
                  {(error as any)?.error || t("pendingSection.errorLoading")}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => refetch()}
                >
                  {t("common:tryAgain")}
                </Button>
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className="rounded-full bg-muted/50 p-5 mb-4">
                  <UserPlus className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">
                  {t("pendingSection.noPending")}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {t("pendingSection.noPendingDesc")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">
                        {t("pendingSection.tableHeaders.consultant")}
                      </TableHead>
                      <TableHead className="text-left">
                        {t("pendingSection.tableHeaders.email")}
                      </TableHead>
                      <TableHead className="text-left">
                        {t("pendingSection.tableHeaders.sentAt")}
                      </TableHead>
                      <TableHead className="text-left">
                        {t("pendingSection.tableHeaders.statusExpires")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("pendingSection.tableHeaders.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((invitation) => {
                      const expired = isExpired(invitation.expiresAt);
                      const timeRemaining = getTimeRemaining(invitation.expiresAt);
                      return (
                        <TableRow
                          key={invitation.id}
                          className={expired ? "bg-destructive/5" : undefined}
                        >
                          <TableCell className="font-medium">
                            {invitation.consultantName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {invitation.consultantEmail}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {format(
                              new Date(invitation.sentAt),
                              "dd/MM/yyyy HH:mm",
                              { locale: dateLocale }
                            )}
                          </TableCell>
                          <TableCell>
                            {expired ? (
                              <Badge variant="destructive" className="text-xs">
                                {t("pendingSection.expired")}
                              </Badge>
                            ) : timeRemaining ? (
                              <span className="text-muted-foreground text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t("pendingSection.expiresIn", {
                                  time: timeRemaining,
                                })}
                              </span>
                            ) : (
                              <Badge variant="secondary">
                                {t("common:status.pending")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!expired ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedInvitation(invitation)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  {t("pendingSection.decline")}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleAccept(invitation)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  {t("pendingSection.accept")}
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedInvitation(invitation)}
                              >
                                {t("common:remove")}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Invite friends (referral) — sidebar */}
        <div className="lg:col-span-5">
          <ChartCard
            title={t("referral.title")}
            subtitle={t("referral.subtitle")}
          >
            {referralLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={referralLink}
                    className="font-mono text-sm min-w-0 bg-muted/30 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyReferralLink}
                    disabled={!referralLink}
                    className="shrink-0 h-9 w-9"
                    title={t("referral.copyLink")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {invitedUsers.length >= REFERRAL_DISCOUNT_THRESHOLD && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-400 px-3 py-2.5 text-sm">
                    <Percent className="h-4 w-4 shrink-0" />
                    <span>{t("referral.discountEarned")}</span>
                  </div>
                )}
                {invitedUsers.length > 0 &&
                  invitedUsers.length < REFERRAL_DISCOUNT_THRESHOLD && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className="text-muted-foreground"
                          dangerouslySetInnerHTML={{
                            __html: t("referral.progressText", {
                              count: invitedUsers.length,
                              total: REFERRAL_DISCOUNT_THRESHOLD,
                              remaining:
                                REFERRAL_DISCOUNT_THRESHOLD - invitedUsers.length,
                            }),
                          }}
                        />
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${referralProgressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-foreground">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {t("referral.invitedPeople", { count: invitedUsers.length })}
                  </h4>
                  {invitedUsers.length === 0 ? (
                    <div className="py-6 px-4 rounded-lg border border-border bg-muted/20 text-center">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-70" />
                      <p className="text-sm font-medium text-foreground">
                        {t("referral.noInvitedYet")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("referral.noInvitedDesc")}
                      </p>
                    </div>
                  ) : (
                    <>
                      <ul className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                        {invitedUsers
                          .slice((invitedPage - 1) * INVITED_PER_PAGE, invitedPage * INVITED_PER_PAGE)
                          .map((u) => (
                          <li
                            key={u.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 hover:bg-muted/20 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-sm">{u.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {u.email}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant={
                                  u.status === "registered" ? "default" : "secondary"
                                }
                                className="text-xs"
                              >
                                {getStatusLabel(u.status)}
                              </Badge>
                              <span className="text-muted-foreground text-xs">
                                {format(new Date(u.registeredAt), "dd/MM/yyyy", {
                                  locale: dateLocale,
                                })}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {invitedUsers.length > INVITED_PER_PAGE && (
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">
                            {(invitedPage - 1) * INVITED_PER_PAGE + 1}–{Math.min(invitedPage * INVITED_PER_PAGE, invitedUsers.length)} / {invitedUsers.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={invitedPage <= 1}
                              onClick={() => setInvitedPage((p) => Math.max(1, p - 1))}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            {Array.from({ length: Math.ceil(invitedUsers.length / INVITED_PER_PAGE) }, (_, i) => i + 1).map((p) => (
                              <Button
                                key={p}
                                variant={invitedPage === p ? "default" : "outline"}
                                size="sm"
                                className="h-7 w-7 p-0 text-xs"
                                onClick={() => setInvitedPage(p)}
                              >
                                {p}
                              </Button>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={invitedPage >= Math.ceil(invitedUsers.length / INVITED_PER_PAGE)}
                              onClick={() => setInvitedPage((p) => Math.min(Math.ceil(invitedUsers.length / INVITED_PER_PAGE), p + 1))}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Decline Confirmation Dialog */}
      <AlertDialog
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.declineTitle")}</AlertDialogTitle>
            <AlertDialogDescription
              dangerouslySetInnerHTML={{
                __html: t("dialogs.declineDesc", {
                  name: selectedInvitation?.consultantName,
                }),
              }}
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedInvitation(null)}>
              {t("common:cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("pendingSection.decline")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disconnect Consultant Confirmation Dialog */}
      <AlertDialog
        open={disconnectDialogOpen}
        onOpenChange={setDisconnectDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dialogs.disconnectTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription
              dangerouslySetInnerHTML={{
                __html: t("dialogs.disconnectDesc", {
                  name: consultantToDisconnect?.name,
                }),
              }}
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setConsultantToDisconnect(null)}
            >
              {t("common:cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnecting
                ? t("dialogs.disconnecting")
                : t("consultantsSection.disconnect")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Invitations;
