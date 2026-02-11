import { useState, useEffect } from "react";
import { 
  User, 
  Bell, 
  Save, 
  Lock, 
  History,
  MessageSquare,
  Plus,
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { userApi, authApi, subscriptionsApi, commentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProfileState {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  birthDate: string;
  riskProfile: string;
}

const Settings = () => {
  const { t } = useTranslation(['settings', 'common']);
  const [activeStep, setActiveStep] = useState<string>("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // State for different sections
  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    email: "",
    phone: "+55 ",
    countryCode: "BR",
    birthDate: "",
    riskProfile: "",
  });

  const formatPhone = (value: string) => {
    // Keep only digits
    const digits = value.replace(/\D/g, "");
    
    // Always ensure it starts with 55
    let formatted = digits;
    if (!formatted.startsWith("55")) {
      formatted = "55" + formatted;
    }

    // Limit to 13 digits (55 + 11)
    formatted = formatted.slice(0, 13);

    // Apply mask: +55 (XX) XXXXX-XXXX
    if (formatted.length <= 2) return `+${formatted}`;
    if (formatted.length <= 4) return `+${formatted.slice(0, 2)} (${formatted.slice(2)}`;
    if (formatted.length <= 9) return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4)}`;
    return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4, 9)}-${formatted.slice(9)}`;
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 12 && digits.length <= 13;
  };

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    transactionAlerts: true,
    goalReminders: true,
    weeklySummary: true,
    marketingEmails: false,
  });

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordError, setPasswordError] = useState("");

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, totalPages: 1 });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentsPagination, setCommentsPagination] = useState({ page: 1, totalPages: 1 });
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [newComment, setNewComment] = useState({ title: "", content: "" });

  const steps = [
    { id: "profile", label: t('settings:tabs.profile'), icon: User },
    { id: "notifications", label: t('settings:tabs.notifications'), icon: Bell },
    { id: "password", label: t('settings:tabs.password'), icon: Lock },
    { id: "history", label: t('settings:tabs.history'), icon: History },
    { id: "comments", label: t('settings:tabs.comments'), icon: MessageSquare },
  ];

  // Load user data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await authApi.me();
        const user = response.user;
        const savedCountryCode = localStorage.getItem("userCountryCode") || "BR";
        setProfile({
          name: user.full_name || "",
          email: user.email || "",
          phone: user.phone ? formatPhone(user.phone) : "+55 ",
          countryCode: savedCountryCode,
          birthDate: user.birth_date || "",
          riskProfile: user.risk_profile || "",
        });
      } catch (error: any) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Fetch History
  useEffect(() => {
    if (activeStep === "history") {
      fetchHistory(1);
    }
  }, [activeStep]);

  // Fetch Comments
  useEffect(() => {
    if (activeStep === "comments") {
      fetchComments(1);
    }
  }, [activeStep]);

  const fetchHistory = async (page: number) => {
    setHistoryLoading(true);
    try {
      const response = await subscriptionsApi.getHistory(page);
      setHistory(response.history);
      setHistoryPagination({
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchComments = async (page: number) => {
    setCommentsLoading(true);
    try {
      const response = await commentsApi.getAll(page);
      setComments(response.comments);
      setCommentsPagination({
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profile.phone && !validatePhone(profile.phone)) {
      toast({ title: t('common:error'), description: t('settings:profile.phoneError'), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await userApi.updateProfile({
        full_name: profile.name,
        phone: profile.phone ? profile.phone.replace(/\D/g, "") : undefined,
        birth_date: profile.birthDate || undefined,
        risk_profile: profile.riskProfile || undefined,
      });
      localStorage.setItem("userCountryCode", profile.countryCode);
      toast({ title: t('common:success'), description: t('settings:profile.saveSuccess'), variant: "success" });
    } catch (error: any) {
      toast({ title: t('common:error'), description: error?.error || t('settings:profile.saveError'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      localStorage.setItem("userNotifications", JSON.stringify(notifications));
      toast({ title: t('common:success'), description: t('settings:notifications.saveSuccess'), variant: "success" });
    } catch (error: any) {
      toast({ title: t('common:error'), description: t('settings:notifications.saveError'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!password.currentPassword || !password.newPassword) {
      setPasswordError(t('settings:password.fillAllFields'));
      return;
    }
    if (password.newPassword !== password.confirmPassword) {
      setPasswordError(t('settings:password.passwordsMismatch'));
      return;
    }
    setSaving(true);
    try {
      await userApi.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      toast({ title: t('common:success'), description: t('settings:password.changeSuccess'), variant: "success" });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      setPasswordError(error?.error || t('settings:password.changeError'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.content.trim()) return;
    setSaving(true);
    try {
      await commentsApi.create(newComment);
      toast({ title: t('common:success'), description: t('settings:comments.sendSuccess'), variant: "success" });
      setNewComment({ title: "", content: "" });
      setIsCreateModalOpen(false);
      fetchComments(1);
    } catch (error: any) {
      toast({ title: t('common:error'), description: t('settings:comments.sendError'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm(t('settings:comments.deleteConfirm'))) return;
    try {
      await commentsApi.delete(id);
      toast({ title: t('common:success'), description: t('settings:comments.deleteSuccess'), variant: "success" });
      fetchComments(commentsPagination.page);
    } catch (error: any) {
      toast({ title: t('common:error'), description: t('settings:comments.deleteError'), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const notificationLabels: Record<string, string> = {
    emailNotifications: t('settings:notifications.labels.emailNotifications'),
    transactionAlerts: t('settings:notifications.labels.transactionAlerts'),
    goalReminders: t('settings:notifications.labels.goalReminders'),
    weeklySummary: t('settings:notifications.labels.weeklySummary'),
    marketingEmails: t('settings:notifications.labels.marketingEmails'),
  };

  const riskProfileOptions = [
    { value: "", label: t('settings:profile.riskOptions.none') },
    { value: "conservador", label: t('settings:profile.riskOptions.conservative') },
    { value: "moderado", label: t('settings:profile.riskOptions.moderate') },
    { value: "arrojado", label: t('settings:profile.riskOptions.aggressive') },
  ];

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('settings:title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('settings:subtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 min-w-0">
        {/* Tab navigation */}
        <div className="w-full lg:w-56 shrink-0">
          <nav className="flex flex-row lg:flex-col gap-2 lg:gap-1 relative overflow-x-auto pb-2 lg:pb-0" aria-label={t('settings:ariaLabel')}>
            {/* Vertical line: inside nav so length = first to last step only; centered on icons; top/bottom = center of first/last (py-2.5 + half h-9 = 1.1875rem) */}
            <div className="absolute left-[1.875rem] top-[1.1875rem] bottom-[1.1875rem] w-px bg-border hidden lg:block z-0 pointer-events-none" />
            {steps.map((step, index) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors shrink-0 lg:shrink",
                    isActive
                      ? "bg-primary/10 border border-primary/30 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-full shrink-0",
                    isActive ? "bg-primary/20 text-primary" : "bg-muted/60"
                  )}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">{step.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area: min-w-0 so table horizontal scroll stays inside content, not page */}
        <div className="flex-1 min-w-0">
          {activeStep === "profile" && (
            <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow">
              <h2 className="text-sm font-semibold text-foreground mb-4">{t('settings:profile.title')}</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('settings:profile.fullName')}</Label>
                  <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder={t('settings:profile.namePlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('settings:profile.email')}</Label>
                  <Input id="email" value={profile.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">{t('settings:profile.emailHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('settings:profile.phone')}</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: formatPhone(e.target.value) })}
                    placeholder={t('settings:profile.phonePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">{t('settings:profile.birthDate')}</Label>
                  <Input id="birthDate" type="date" value={profile.birthDate} onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings:profile.riskProfile')}</Label>
                  <Select value={profile.riskProfile || "none"} onValueChange={(v) => setProfile({ ...profile, riskProfile: v === "none" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('settings:profile.riskProfilePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {riskProfileOptions.map((opt) => (
                        <SelectItem key={opt.value || "none"} value={opt.value || "none"}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t('settings:profile.riskProfileHint')}</p>
                </div>
                <div className="pt-2">
                  <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? t('settings:profile.saving') : t('settings:profile.saveProfile')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeStep === "notifications" && (
            <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow">
              <h2 className="text-sm font-semibold text-foreground mb-4">{t('settings:notifications.title')}</h2>
              <div className="space-y-5 py-2">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <Label htmlFor={key} className="text-sm font-medium text-foreground flex-1">
                      {notificationLabels[key] || key}
                    </Label>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, [key]: checked })}
                      className="data-[state=checked]:bg-primary shrink-0"
                    />
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <Button onClick={handleSaveNotifications} disabled={saving} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? t('settings:notifications.saving') : t('settings:notifications.saveNotifications')}
                </Button>
              </div>
            </div>
          )}

          {activeStep === "password" && (
            <div className="rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow">
              <h2 className="text-sm font-semibold text-foreground mb-4">{t('settings:password.title')}</h2>
              <div className="space-y-4 max-w-md">
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('settings:password.currentPassword')}</Label>
                  <Input id="currentPassword" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('settings:password.newPassword')}</Label>
                  <Input id="newPassword" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} placeholder="••••••••" />
                  <p className="text-xs text-muted-foreground">{t('settings:password.newPasswordHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('settings:password.confirmPassword')}</Label>
                  <Input id="confirmPassword" type="password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} placeholder="••••••••" />
                </div>
                <div className="pt-2">
                  <Button onClick={handleChangePassword} disabled={saving} className="w-full sm:w-auto">
                    <Lock className="h-4 w-4 mr-2" />
                    {saving ? t('settings:password.changing') : t('settings:password.changePassword')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeStep === "history" && (
            <div className="rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow">
              <h2 className="text-sm font-semibold text-foreground mb-4">{t('settings:history.title')}</h2>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">{t('settings:history.noPurchases')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('settings:history.noPurchasesDesc')}</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>{t('settings:history.tableHeaders.plan')}</TableHead>
                          <TableHead>{t('settings:history.tableHeaders.price')}</TableHead>
                          <TableHead>{t('settings:history.tableHeaders.date')}</TableHead>
                          <TableHead>{t('settings:history.tableHeaders.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((item) => (
                          <TableRow key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <TableCell className="font-medium">{item.planName}</TableCell>
                            <TableCell>R$ {(item.priceCents / 100).toFixed(2)}</TableCell>
                            <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy")}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === "active" ? "default" : "secondary"} className={cn(item.status === "active" && "bg-success/10 text-success border-0")}>
                                {item.status === "active" ? t('common:active') : item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {historyPagination.totalPages > 1 && (
                    <div className="mt-4 flex justify-end">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem><PaginationPrevious onClick={() => historyPagination.page > 1 && fetchHistory(historyPagination.page - 1)} /></PaginationItem>
                          <PaginationItem><PaginationNext onClick={() => historyPagination.page < historyPagination.totalPages && fetchHistory(historyPagination.page + 1)} /></PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeStep === "comments" && (
            <div className="rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow min-w-0 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-sm font-semibold text-foreground">{t('settings:comments.title')}</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchComments(commentsPagination.page)}
                    disabled={commentsLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", commentsLoading && "animate-spin")} />
                    {t('settings:comments.refresh')}
                  </Button>
                  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('settings:comments.newComment')}
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('settings:comments.createDialog.title')}</DialogTitle>
                      <DialogDescription>
                        {t('settings:comments.createDialog.description')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">{t('settings:comments.createDialog.titleLabel')}</Label>
                        <Input
                          id="title"
                          value={newComment.title}
                          onChange={(e) => setNewComment({ ...newComment, title: e.target.value })}
                          placeholder={t('settings:comments.createDialog.titlePlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">{t('settings:comments.createDialog.contentLabel')}</Label>
                        <Textarea
                          id="content"
                          value={newComment.content}
                          onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                          placeholder={t('settings:comments.createDialog.contentPlaceholder')}
                          className="min-h-[150px]"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{t('common:cancel')}</Button>
                      <Button onClick={handleAddComment} disabled={saving || !newComment.content.trim()}>
                        {saving ? t('settings:comments.createDialog.sending') : t('settings:comments.createDialog.send')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
              <div className="space-y-4">
                {commentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-foreground">{t('settings:comments.noComments')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('settings:comments.noCommentsDesc')}</p>
                  </div>
                ) : (
                <>
                <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-border">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[50px]">{t('settings:comments.tableHeaders.number')}</TableHead>
                      <TableHead>{t('settings:comments.tableHeaders.title')}</TableHead>
                      <TableHead>{t('settings:comments.tableHeaders.content')}</TableHead>
                      <TableHead>{t('settings:comments.tableHeaders.status')}</TableHead>
                      <TableHead>{t('settings:comments.tableHeaders.process')}</TableHead>
                      <TableHead>{t('settings:comments.tableHeaders.createdAt')}</TableHead>
                      <TableHead>{t('settings:comments.tableHeaders.processedAt')}</TableHead>
                      <TableHead>{t('settings:comments.tableHeaders.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments.map((c, index) => {
                      return (
                        <TableRow key={c.id}>
                          <TableCell>{(commentsPagination.page - 1) * 10 + index + 1}</TableCell>
                          <TableCell className="font-medium">{c.title || t('settings:comments.noTitle')}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{c.content}</TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'replied' ? 'success' : 'secondary'} className={cn(c.status === 'replied' ? "bg-success/10 text-success border-success/20" : "")}>
                              {c.status === 'replied' ? t('settings:comments.statusReplied') : t('settings:comments.statusPending')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {c.status === 'replied' ? t('settings:comments.processFinished') : t('settings:comments.processAnalysis')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {c.processed_at ? format(new Date(c.processed_at), "dd/MM/yyyy HH:mm") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  setSelectedComment(c);
                                  setIsDetailModalOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteComment(c.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>

                {commentsPagination.totalPages > 1 && (
                  <div className="flex justify-end pt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => commentsPagination.page > 1 && fetchComments(commentsPagination.page - 1)}
                            className={cn(commentsPagination.page === 1 && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => commentsPagination.page < commentsPagination.totalPages && fetchComments(commentsPagination.page + 1)}
                            className={cn(commentsPagination.page === commentsPagination.totalPages && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
                </>
                )}
              </div>

                {/* Detail Modal */}
                <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{selectedComment?.title || t('settings:comments.detail.title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">{t('settings:comments.detail.yourMessage')}</Label>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm whitespace-pre-wrap">
                          {selectedComment?.content}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right italic">
                          {t('settings:comments.detail.sentAt')} {selectedComment && format(new Date(selectedComment.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>

                      {selectedComment?.reply && (
                        <div className="space-y-2">
                          <Label className="text-success font-semibold">{t('settings:comments.detail.adminReply')}</Label>
                          <div className="p-4 bg-success/5 rounded-lg border border-success/20 text-sm whitespace-pre-wrap">
                            {selectedComment.reply}
                          </div>
                          <p className="text-[10px] text-muted-foreground text-right italic">
                            {t('settings:comments.detail.repliedAt')} {selectedComment.processed_at && format(new Date(selectedComment.processed_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      )}

                      {!selectedComment?.reply && (
                        <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground italic">
                          {t('settings:comments.detail.waitingReply')}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setIsDetailModalOpen(false)}>{t('common:close')}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
