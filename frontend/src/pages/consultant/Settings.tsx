import { useState, useEffect } from "react";
import {
  User,
  Bell,
  Lock,
  History,
  MessageSquare,
  Plus,
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  HelpCircle,
  LogOut,
  UserCircle,
  ShoppingBag,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { consultantApi, userApi, subscriptionsApi, commentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  Pagination,
  PaginationContent,
  PaginationItem,
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
import { PhoneCountrySelect, getCountryPrefix } from "@/components/ui/country-select";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency, type CurrencyCode } from "@/contexts/CurrencyContext";

const Settings = () => {
  const { t, i18n } = useTranslation(['consultant', 'common']);
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const [activeStep, setActiveStep] = useState<string>("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "BR",
    bio: "",
    specialty: "",
    cref: "",
  });

  // Format local phone number (without country prefix)
  const formatLocalPhone = (value: string, countryCode: string) => {
    const digits = value.replace(/\D/g, "");

    if (countryCode === "BR") {
      // Brazil: (XX) XXXXX-XXXX — max 11 digits
      const limited = digits.slice(0, 11);
      if (limited.length <= 2) return limited.length > 0 ? `(${limited}` : "";
      if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
    // Generic: just digits, max 15
    return digits.slice(0, 15);
  };

  const validatePhone = (phone: string, countryCode: string) => {
    const digits = phone.replace(/\D/g, "");
    if (countryCode === "BR") return digits.length >= 10 && digits.length <= 11;
    return digits.length >= 4 && digits.length <= 15;
  };

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    clientMessages: true,
    newClients: true,
    reportReady: true,
    weeklySummary: true,
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

  const getUserInitials = () => {
    if (profile.name) {
      const names = profile.name.trim().split(' ');
      if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      return names[0][0].toUpperCase();
    }
    if (user?.full_name) {
      const names = user.full_name.trim().split(' ');
      if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      return names[0][0].toUpperCase();
    }
    return 'C';
  };

  const mainSteps = [
    { id: "profile", label: t('consultant:settings.steps.profile') },
    { id: "password", label: t('consultant:settings.password.title') },
    { id: "notifications", label: t('consultant:settings.steps.notifications') },
    { id: "history", label: t('consultant:settings.steps.history') },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await consultantApi.getProfile();
        const user = response.user;
        const savedCountryCode = localStorage.getItem("consultantCountryCode") || "BR";
        // Strip country prefix from stored phone to get local number
        let localPhone = "";
        if (user.phone) {
          const phoneDigits = user.phone.replace(/\D/g, "");
          const prefix = getCountryPrefix(savedCountryCode).replace("+", "");
          localPhone = phoneDigits.startsWith(prefix) ? phoneDigits.slice(prefix.length) : phoneDigits;
          localPhone = formatLocalPhone(localPhone, savedCountryCode);
        }
        setProfile({
          name: user.full_name || "",
          email: user.email || "",
          phone: localPhone,
          countryCode: savedCountryCode,
          bio: user.bio || "",
          specialty: user.specialty || "",
          cref: user.cref || "",
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
    const localDigits = profile.phone.replace(/\D/g, "");
    if (localDigits && !validatePhone(profile.phone, profile.countryCode)) {
      toast({ title: t('common:error'), description: t('consultant:settings.profile.phoneError'), variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      // Combine country prefix + local number for storage
      const prefix = getCountryPrefix(profile.countryCode).replace("+", "");
      const fullPhone = localDigits ? prefix + localDigits : undefined;
      await consultantApi.updateProfile({
        full_name: profile.name,
        phone: fullPhone,
        cref: profile.cref || undefined,
        specialty: profile.specialty || undefined,
        bio: profile.bio || undefined,
      });
      localStorage.setItem("consultantCountryCode", profile.countryCode);
      toast({ title: t('common:success'), description: t('consultant:settings.profile.updateSuccess'), variant: "success" });
    } catch (error: any) {
      toast({ title: t('common:error'), description: t('consultant:settings.profile.updateError'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      localStorage.setItem("consultantNotifications", JSON.stringify(notifications));
      toast({ title: t('common:success'), description: t('consultant:settings.notifications.updateSuccess'), variant: "success" });
    } catch (error: any) {
      toast({ title: t('common:error'), description: t('consultant:settings.notifications.updateError'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!password.currentPassword || !password.newPassword) {
      setPasswordError(t('consultant:settings.password.fillAllFields'));
      return;
    }
    setSaving(true);
    try {
      await userApi.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      toast({ title: t('common:success'), description: t('consultant:settings.password.changeSuccess'), variant: "success" });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      setPasswordError(t('consultant:settings.password.changeError'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.content.trim()) return;
    setSaving(true);
    try {
      await commentsApi.create(newComment);
      toast({ title: t('common:success'), description: t('consultant:settings.feedback.submitSuccess'), variant: "success" });
      setNewComment({ title: "", content: "" });
      setIsCreateModalOpen(false);
      fetchComments(1);
    } catch (error: any) {
      toast({ title: t('common:error'), description: t('consultant:settings.feedback.submitError'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm(t('consultant:settings.feedback.deleteConfirm'))) return;
    try {
      await commentsApi.delete(id);
      toast({ title: t('common:success'), description: t('consultant:settings.feedback.deleteSuccess'), variant: "success" });
      fetchComments(commentsPagination.page);
    } catch (error: any) {
      toast({ title: t('common:error'), description: t('consultant:settings.feedback.deleteError'), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 min-w-0">
        {/* Sidebar navigation */}
        <div className="w-full lg:w-56 shrink-0">
          <div className="settings-card !px-3 !pt-8 !pb-3 h-full">
            <nav className="flex flex-row lg:flex-col gap-0.5 overflow-x-auto" aria-label={t('consultant:settings.title')}>
              {mainSteps.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={cn(
                      "relative text-left px-4 py-2.5 text-sm font-medium transition-colors shrink-0 lg:shrink rounded-md",
                      isActive
                        ? "text-primary bg-primary/15 dark:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary hidden lg:block" />
                    )}
                    {isActive && (
                      <span className="absolute left-1 right-1 bottom-0 h-[2px] rounded-full bg-primary lg:hidden" />
                    )}
                    {step.label}
                  </button>
                );
              })}

              {/* Separator */}
              <div className="hidden lg:block my-2 mx-2 h-px bg-border/50" />

              {/* Help & Support */}
              <button
                onClick={() => setActiveStep("comments")}
                className={cn(
                  "relative text-left px-4 py-2.5 text-sm font-medium transition-colors shrink-0 lg:shrink flex items-center gap-2 rounded-md",
                  activeStep === "comments"
                    ? "text-primary bg-primary/15 dark:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {activeStep === "comments" && (
                  <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary hidden lg:block" />
                )}
                <HelpCircle className="h-4 w-4" />
                {t('consultant:settings.steps.comments')}
              </button>

              {/* Sign Out */}
              <button
                onClick={logout}
                className="relative text-left px-4 py-2.5 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors shrink-0 lg:shrink flex items-center gap-2 rounded-md hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                {t('common:logout')}
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pt-2 lg:pt-0 flex flex-col">
          {activeStep === "profile" && (
            <div className="settings-card flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-6">{t('consultant:settings.steps.profile')}</h1>

              {/* Avatar header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {getUserInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-foreground truncate">{profile.name || t('consultant:settings.profile.fullName')}</h2>
                  <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border/50 mb-6" />

              {/* Personal Information section */}
              <div className="flex items-center gap-2 mb-1">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">{t('consultant:settings.profile.title')}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t('consultant:settings.subtitle')}</p>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('consultant:settings.profile.fullName')}</Label>
                    <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('consultant:settings.profile.email')}</Label>
                    <Input id="email" value={profile.email} disabled className="bg-muted/50" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('consultant:settings.profile.phone')}</Label>
                    <div className="flex h-10 w-full rounded-lg border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-colors">
                      <PhoneCountrySelect
                        value={profile.countryCode}
                        onValueChange={(code) => {
                          setProfile({ ...profile, countryCode: code, phone: "" });
                        }}
                      />
                      <div className="w-px bg-border/50 shrink-0" />
                      <input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: formatLocalPhone(e.target.value, profile.countryCode) })}
                        placeholder={profile.countryCode === "BR" ? "(XX) XXXXX-XXXX" : t('consultant:settings.profile.phonePlaceholder')}
                        className="flex-1 bg-transparent px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none md:text-sm min-w-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cref">{t('consultant:settings.profile.cref')}</Label>
                    <Input id="cref" value={profile.cref} onChange={(e) => setProfile({ ...profile, cref: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="specialty">{t('consultant:settings.profile.specialty')}</Label>
                    <Input id="specialty" value={profile.specialty} onChange={(e) => setProfile({ ...profile, specialty: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">{t('consultant:settings.profile.currency')}</Label>
                    <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">{t('consultant:settings.profile.currencyOptions.BRL')}</SelectItem>
                        <SelectItem value="USD">{t('consultant:settings.profile.currencyOptions.USD')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('consultant:settings.profile.currencyHint')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">{t('consultant:settings.profile.bio')}</Label>
                  <Textarea id="bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} />
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? t('consultant:settings.profile.saving') : t('consultant:settings.profile.save')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeStep === "notifications" && (
            <div className="settings-card flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-6">{t('consultant:settings.steps.notifications')}</h1>
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">{t('consultant:settings.notifications.title')}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t('consultant:settings.subtitle')}</p>
              <div className="space-y-5">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor={key} className="text-sm font-medium text-foreground">
                        {t(`consultant:settings.notifications.${key}`)}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`consultant:settings.notifications.descriptions.${key}`)}
                      </p>
                    </div>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, [key]: checked })}
                      className="shrink-0 mt-0.5"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-6">
                <Button onClick={handleSaveNotifications} disabled={saving}>
                  {saving ? t('consultant:settings.notifications.saving') : t('consultant:settings.notifications.save')}
                </Button>
              </div>
            </div>
          )}

          {activeStep === "password" && (
            <div className="settings-card flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-6">{t('consultant:settings.password.title')}</h1>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">{t('consultant:settings.password.change')}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t('consultant:settings.subtitle')}</p>
              <div className="space-y-5 max-w-lg">
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('consultant:settings.password.current')}</Label>
                  <Input id="currentPassword" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('consultant:settings.password.new')}</Label>
                    <Input id="newPassword" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('consultant:settings.password.confirm')}</Label>
                    <Input id="confirmPassword" type="password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} placeholder="••••••••" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleChangePassword} disabled={saving}>
                    {saving ? t('consultant:settings.password.changing') : t('consultant:settings.password.change')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeStep === "history" && (
            <div className="settings-card flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-6">{t('consultant:settings.steps.history')}</h1>
              <div className="flex items-center gap-2 mb-1">
                <History className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">{t('consultant:settings.history.title')}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t('consultant:settings.subtitle')}</p>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">{t('consultant:settings.history.empty')}</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>{t('consultant:settings.history.plan')}</TableHead>
                          <TableHead>{t('consultant:settings.history.date')}</TableHead>
                          <TableHead>{t('consultant:settings.history.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((item) => (
                          <TableRow key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <TableCell className="font-medium">{item.planName}</TableCell>
                            <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy", { locale: dateLocale })}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className={cn(item.status === 'active' && "bg-success/10 text-success border-0")}>
                                {t(`common:status.${item.status}`, { defaultValue: item.status })}
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
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => historyPagination.page > 1 && fetchHistory(historyPagination.page - 1)}
                              className={cn(historyPagination.page === 1 && "pointer-events-none opacity-50")}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => historyPagination.page < historyPagination.totalPages && fetchHistory(historyPagination.page + 1)}
                              className={cn(historyPagination.page === historyPagination.totalPages && "pointer-events-none opacity-50")}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeStep === "comments" && (
            <div className="settings-card flex-1 min-w-0 overflow-hidden">
              <h1 className="text-xl font-semibold text-foreground mb-6">{t('consultant:settings.steps.comments')}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-base font-semibold text-foreground">{t('consultant:settings.feedback.title')}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('consultant:settings.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchComments(commentsPagination.page)}
                    disabled={commentsLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", commentsLoading && "animate-spin")} />
                    {t('consultant:settings.feedback.refresh')}
                  </Button>
                  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('consultant:settings.feedback.new')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('consultant:settings.feedback.newTitle')}</DialogTitle>
                        <DialogDescription>
                          {t('consultant:settings.feedback.newDescription')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">{t('consultant:settings.feedback.fieldTitle')}</Label>
                          <Input
                            id="title"
                            value={newComment.title}
                            onChange={(e) => setNewComment({ ...newComment, title: e.target.value })}
                            placeholder={t('consultant:settings.feedback.titlePlaceholder')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="content">{t('consultant:settings.feedback.message')}</Label>
                          <Textarea
                            id="content"
                            value={newComment.content}
                            onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                            placeholder={t('consultant:settings.feedback.messagePlaceholder')}
                            className="min-h-[150px]"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{t('common:cancel')}</Button>
                        <Button onClick={handleAddComment} disabled={saving || !newComment.content.trim()}>
                          {saving ? t('consultant:settings.feedback.sending') : t('consultant:settings.feedback.send')}
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
                    <p className="text-sm font-medium text-foreground">{t('consultant:settings.feedback.noFeedback')}</p>
                  </div>
                ) : (
                  <>
                    <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-border comments-table-scrollbar">
                      <Table className="min-w-[600px]">
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="w-[50px]">{t('consultant:settings.feedback.no')}</TableHead>
                            <TableHead>{t('consultant:settings.feedback.tableTitle')}</TableHead>
                            <TableHead>{t('consultant:settings.feedback.content')}</TableHead>
                            <TableHead>{t('consultant:settings.feedback.status')}</TableHead>
                            <TableHead>{t('consultant:settings.feedback.process')}</TableHead>
                            <TableHead>{t('consultant:settings.feedback.createdAt')}</TableHead>
                            <TableHead>{t('consultant:settings.feedback.processedAt')}</TableHead>
                            <TableHead>{t('consultant:settings.feedback.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comments.map((c, index) => (
                            <TableRow key={c.id}>
                              <TableCell>{(commentsPagination.page - 1) * 10 + index + 1}</TableCell>
                              <TableCell className="font-medium">{c.title || t('consultant:settings.feedback.noTitle')}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{c.content}</TableCell>
                              <TableCell>
                                <Badge variant={c.status === 'replied' ? 'success' : 'secondary'} className={cn(c.status === 'replied' ? "bg-success/10 text-success border-success/20" : "")}>
                                  {c.status === 'replied' ? t('consultant:settings.feedback.replied') : t('consultant:settings.feedback.pending')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {c.status === 'replied' ? t('consultant:settings.feedback.finished') : t('consultant:settings.feedback.analyzing')}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {c.processed_at ? format(new Date(c.processed_at), "dd/MM/yyyy HH:mm", { locale: dateLocale }) : "-"}
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
                          ))}
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
                    <DialogTitle>{selectedComment?.title || t('consultant:settings.feedback.detailTitle')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">{t('consultant:settings.feedback.yourFeedback')}</Label>
                      <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm whitespace-pre-wrap">
                        {selectedComment?.content}
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right italic">
                        {t('consultant:settings.feedback.sentOn')}: {selectedComment && format(new Date(selectedComment.created_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                      </p>
                    </div>

                    {selectedComment?.reply && (
                      <div className="space-y-2">
                        <Label className="text-success font-semibold">{t('consultant:settings.feedback.adminReply')}</Label>
                        <div className="p-4 bg-success/5 rounded-lg border border-success/20 text-sm whitespace-pre-wrap">
                          {selectedComment.reply}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right italic">
                          {t('consultant:settings.feedback.repliedOn')}: {selectedComment.processed_at && format(new Date(selectedComment.processed_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                        </p>
                      </div>
                    )}

                    {!selectedComment?.reply && (
                      <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground italic">
                        {t('consultant:settings.feedback.awaitingReply')}
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
