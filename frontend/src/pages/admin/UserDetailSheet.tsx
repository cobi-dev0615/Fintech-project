import { useState, useEffect, useCallback } from "react";
import {
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  Shield,
  CreditCard,
  Wallet,
  TrendingUp,
  Link2,
  Target,
  Users,
  CheckCircle2,
  XCircle,
  Ban,
  Unlock,
  Trash2,
  Loader2,
  PieChart,
  RefreshCw,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface UserDetail {
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

interface UserDetailSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

type ConfirmAction = "approve" | "reject" | "block" | "unblock" | "delete" | null;

export default function UserDetailSheet({
  userId,
  open,
  onOpenChange,
  onUserUpdated,
}: UserDetailSheetProps) {
  const { t, i18n } = useTranslation(["admin", "common"]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [plans, setPlans] = useState<Array<{ id: string; code: string; name: string; isActive: boolean; role: string | null }>>([]);
  const [showPlanChange, setShowPlanChange] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [changingPlan, setChangingPlan] = useState(false);

  const locale =
    i18n.language === "pt-BR" || i18n.language === "pt" ? "pt-BR" : "en-US";

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await adminApi.getUser(userId);
      setUser(res.user);
    } catch {
      toast({
        title: t("common:error"),
        description: t("admin:userDetail.loadError"),
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await adminApi.getPlans();
      setPlans(res.plans || []);
    } catch {
      // Plans fetch is non-critical, silently fail
    }
  }, []);

  useEffect(() => {
    if (open && userId) {
      fetchUser();
      fetchPlans();
    } else {
      setUser(null);
      setShowPlanChange(false);
      setSelectedPlanId("");
    }
  }, [open, userId, fetchUser, fetchPlans]);

  const handleChangePlan = async () => {
    if (!user || !selectedPlanId) return;
    setChangingPlan(true);
    try {
      await adminApi.changeUserPlan(user.id, selectedPlanId);
      toast({ title: t("admin:userDetail.changePlanSuccess") });
      setShowPlanChange(false);
      setSelectedPlanId("");
      fetchUser();
      onUserUpdated();
    } catch {
      toast({
        title: t("common:error"),
        description: t("admin:userDetail.changePlanError"),
        variant: "destructive",
      });
    } finally {
      setChangingPlan(false);
    }
  };

  // Filter plans by user role
  const availablePlans = plans.filter(p => {
    if (!p.isActive) return false;
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "consultant") return p.role === "consultant" || p.role === null;
    return p.role === "customer" || p.role === null;
  });

  const handleAction = async () => {
    if (!user || !confirmAction) return;
    setActionLoading(true);
    try {
      switch (confirmAction) {
        case "approve":
          await adminApi.approveUser(user.id);
          toast({ title: t("admin:userDetail.actions.approveSuccess") });
          break;
        case "reject":
          await adminApi.rejectUser(user.id);
          toast({ title: t("admin:userDetail.actions.rejectSuccess") });
          break;
        case "block":
          await adminApi.updateUserStatus(user.id, "blocked");
          toast({ title: t("admin:userDetail.actions.blockSuccess") });
          break;
        case "unblock":
          await adminApi.updateUserStatus(user.id, "active");
          toast({ title: t("admin:userDetail.actions.unblockSuccess") });
          break;
        case "delete":
          await adminApi.deleteUser(user.id);
          toast({ title: t("admin:userManagement.deleteSuccess") });
          onOpenChange(false);
          break;
      }
      onUserUpdated();
      if (confirmAction !== "delete") {
        fetchUser();
      }
    } catch {
      toast({
        title: t("common:error"),
        description: t("admin:userDetail.actions.actionError"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      customer: "bg-blue-500/10 text-blue-500",
      consultant: "bg-purple-500/10 text-purple-500",
      admin: "bg-orange-500/10 text-orange-500",
    };
    const label =
      role === "customer"
        ? t("admin:userManagement.roles.customer")
        : role === "consultant"
          ? t("admin:userManagement.roles.consultant")
          : role === "admin"
            ? t("admin:userManagement.roles.admin")
            : role;
    return (
      <Badge className={styles[role] ?? "bg-muted text-muted-foreground"}>
        {label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-500/10 text-green-600",
      blocked: "bg-red-500/10 text-red-600",
      pending: "bg-amber-500/10 text-amber-600",
    };
    const label =
      status === "active"
        ? t("admin:userManagement.status.active")
        : status === "blocked"
          ? t("admin:userManagement.status.suspended")
          : t("admin:userManagement.status.inactive");
    return (
      <Badge className={styles[status] ?? "bg-muted text-muted-foreground"}>
        {label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const confirmMessages: Record<
    string,
    { title: string; description: string; variant?: string }
  > = {
    approve: {
      title: t("admin:userDetail.confirm.approveTitle"),
      description: t("admin:userDetail.confirm.approveDesc"),
    },
    reject: {
      title: t("admin:userDetail.confirm.rejectTitle"),
      description: t("admin:userDetail.confirm.rejectDesc"),
    },
    block: {
      title: t("admin:userDetail.confirm.blockTitle"),
      description: t("admin:userDetail.confirm.blockDesc"),
      variant: "destructive",
    },
    unblock: {
      title: t("admin:userDetail.confirm.unblockTitle"),
      description: t("admin:userDetail.confirm.unblockDesc"),
    },
    delete: {
      title: t("admin:userDetail.confirm.deleteTitle"),
      description: t("admin:userDetail.confirm.deleteDesc"),
      variant: "destructive",
    },
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
          <SheetTitle className="sr-only">
            {t("admin:userDetail.title")}
          </SheetTitle>

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : user ? (
            <div className="space-y-6 pb-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-foreground truncate">
                    {user.name}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user.status)}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">
                    {t("admin:userDetail.tabs.overview")}
                  </TabsTrigger>
                  <TabsTrigger value="finance" className="flex-1">
                    {t("admin:userDetail.tabs.finance")}
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="flex-1">
                    {t("admin:userDetail.tabs.actions")}
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-5 mt-4">
                  {/* Personal Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("admin:userDetail.personalInfo")}
                    </h3>
                    <div className="grid gap-3">
                      <InfoRow
                        icon={Mail}
                        label={t("admin:userManagement.tableHeaders.email")}
                        value={user.email}
                      />
                      <InfoRow
                        icon={Phone}
                        label={t("admin:userDetail.phone")}
                        value={user.phone || "—"}
                      />
                      <InfoRow
                        icon={Globe}
                        label={t("admin:userDetail.country")}
                        value={user.countryCode}
                      />
                      <InfoRow
                        icon={Calendar}
                        label={t("admin:userDetail.birthDate")}
                        value={
                          user.birthDate ? formatDate(user.birthDate) : "—"
                        }
                      />
                      <InfoRow
                        icon={Shield}
                        label={t("admin:userDetail.riskProfile")}
                        value={user.riskProfile || "—"}
                      />
                      <InfoRow
                        icon={Calendar}
                        label={t("admin:userManagement.tableHeaders.createdAt")}
                        value={formatDate(user.createdAt)}
                      />
                    </div>
                  </div>

                  {/* Subscription */}
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("admin:userDetail.subscription")}
                    </h3>
                    {user.subscription ? (
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {user.subscription.planName}
                          </span>
                          <Badge className="bg-green-500/10 text-green-600">
                            {user.subscription.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(user.subscription.planPrice)}
                          {" / "}
                          {t("admin:userDetail.month")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("admin:userDetail.period")}:{" "}
                          {formatDate(user.subscription.currentPeriodStart)}
                          {" — "}
                          {formatDate(user.subscription.currentPeriodEnd)}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("admin:userDetail.noSubscription")}
                      </p>
                    )}

                    {/* Change Plan */}
                    {!showPlanChange ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => setShowPlanChange(true)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t("admin:userDetail.changePlan")}
                      </Button>
                    ) : (
                      <div className="rounded-lg border border-border p-3 space-y-3">
                        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("admin:userDetail.selectPlan")} />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePlans.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleChangePlan}
                            disabled={!selectedPlanId || changingPlan}
                          >
                            {changingPlan && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                            {t("admin:userDetail.savePlan")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setShowPlanChange(false); setSelectedPlanId(""); }}
                            disabled={changingPlan}
                          >
                            {t("common:cancel")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("admin:userDetail.stats")}
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard
                        icon={Link2}
                        label={t("admin:userDetail.connections")}
                        value={user.stats.connections}
                      />
                      <StatCard
                        icon={Target}
                        label={t("admin:userDetail.goals")}
                        value={user.stats.goals}
                      />
                      <StatCard
                        icon={Users}
                        label={
                          user.role === "consultant"
                            ? t("admin:userDetail.clients")
                            : t("admin:userDetail.consultantsLabel")
                        }
                        value={
                          user.role === "consultant"
                            ? user.stats.clients
                            : user.consultants.length
                        }
                      />
                    </div>
                  </div>

                  {/* Consultants list (for customers) */}
                  {user.role === "customer" && user.consultants.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("admin:userDetail.consultantsLabel")}
                        </h3>
                        <div className="space-y-2">
                          {user.consultants.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between rounded-lg border border-border p-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {c.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {c.email}
                                </p>
                              </div>
                              <Badge
                                className={
                                  c.relationshipStatus === "active"
                                    ? "bg-green-500/10 text-green-600"
                                    : "bg-muted text-muted-foreground"
                                }
                              >
                                {c.relationshipStatus}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Finance Tab */}
                <TabsContent value="finance" className="space-y-5 mt-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("admin:userDetail.financialSummary")}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <FinanceCard
                        icon={Wallet}
                        label={t("admin:userDetail.cash")}
                        value={formatCurrency(user.financialSummary.cash)}
                        color="text-green-600"
                      />
                      <FinanceCard
                        icon={TrendingUp}
                        label={t("admin:userDetail.investments")}
                        value={formatCurrency(
                          user.financialSummary.investments
                        )}
                        color="text-blue-600"
                      />
                      <FinanceCard
                        icon={CreditCard}
                        label={t("admin:userDetail.debt")}
                        value={formatCurrency(user.financialSummary.debt)}
                        color="text-red-600"
                      />
                      <FinanceCard
                        icon={TrendingUp}
                        label={t("admin:userDetail.netWorth")}
                        value={formatCurrency(user.financialSummary.netWorth)}
                        color={
                          user.financialSummary.netWorth >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      />
                    </div>
                  </div>

                  {user.role === "customer" && (
                    <>
                      <Separator />
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/admin/users/${user.id}/finance`);
                        }}
                      >
                        <PieChart className="h-4 w-4" />
                        {t("admin:userDetail.viewFullFinance")}
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* Actions Tab */}
                <TabsContent value="actions" className="space-y-4 mt-4">
                  {/* Approve / Reject for pending users */}
                  {user.status === "pending" && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("admin:userDetail.actions.pendingSection")}
                      </h3>
                      <div className="flex gap-3">
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => setConfirmAction("approve")}
                          disabled={actionLoading}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {t("admin:userDetail.actions.approve")}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 gap-2"
                          onClick={() => setConfirmAction("reject")}
                          disabled={actionLoading}
                        >
                          <XCircle className="h-4 w-4" />
                          {t("admin:userDetail.actions.reject")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Block / Unblock */}
                  {user.status !== "pending" && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("admin:userDetail.actions.accessSection")}
                      </h3>
                      {user.status === "blocked" ? (
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => setConfirmAction("unblock")}
                          disabled={actionLoading}
                        >
                          <Unlock className="h-4 w-4" />
                          {t("admin:userDetail.actions.unblock")}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          onClick={() => setConfirmAction("block")}
                          disabled={actionLoading}
                        >
                          <Ban className="h-4 w-4" />
                          {t("admin:userDetail.actions.block")}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Delete */}
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground text-red-600">
                      {t("admin:userDetail.actions.dangerZone")}
                    </h3>
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => setConfirmAction("delete")}
                      disabled={actionLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("admin:userDetail.actions.delete")}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {t("admin:userDetail.actions.deleteWarning")}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction && confirmMessages[confirmAction]?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && confirmMessages[confirmAction]?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t("common:cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={actionLoading}
              className={
                confirmAction &&
                confirmMessages[confirmAction]?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("common:confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// --- Helper sub-components ---

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex items-center justify-between flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm text-foreground truncate ml-2">{value}</span>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
      <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FinanceCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-sm font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
