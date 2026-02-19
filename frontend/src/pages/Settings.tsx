import { useState, useEffect } from "react";
import {
  Bell,
  Lock,
  History,
  MessageSquare,
  Plus,
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  ShoppingBag,
  HelpCircle,
  LogOut,
  UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { userApi, authApi, subscriptionsApi, commentsApi, notificationsApi } from "@/lib/api";
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
import { PhoneCountrySelect, getCountryPrefix, COUNTRIES } from "@/components/ui/country-select";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency, type CurrencyCode } from "@/contexts/CurrencyContext";

interface ProfileState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  birthDate: string;
  riskProfile: string;
}

// Mapping between Settings toggle keys and backend notification types
const NOTIFICATION_TYPE_MAP: Record<string, string> = {
  transactionAlerts: 'transaction_alert',
  goalReminders: 'goal_milestone',
  weeklySummary: 'report_ready',
  marketingEmails: 'system_announcement',
};

const Settings = () => {
  const { t } = useTranslation(['settings', 'common']);
  const [activeStep, setActiveStep] = useState<string>("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const { currency, setCurrency, formatCurrency } = useCurrency();

  // State for different sections
  const [profile, setProfile] = useState<ProfileState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    countryCode: "BR",
    birthDate: "",
    riskProfile: "",
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

  const getUserInitials = () => {
    if (profile.firstName && profile.lastName) {
      return (profile.firstName[0] + profile.lastName[0]).toUpperCase();
    }
    if (profile.firstName) return profile.firstName[0].toUpperCase();
    if (user?.full_name) {
      const names = user.full_name.trim().split(' ');
      if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      return names[0][0].toUpperCase();
    }
    return 'U';
  };

  const getFullName = () => {
    return [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  };

  const mainSteps = [
    { id: "profile", label: t('settings:tabs.profile') },
    { id: "password", label: t('settings:tabs.security') },
    { id: "notifications", label: t('settings:tabs.notifications') },
    { id: "history", label: t('settings:tabs.history') },
  ];

  // Load user data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await authApi.me();
        const user = response.user;
        const savedCountryCode = localStorage.getItem("userCountryCode") || "BR";
        const nameParts = (user.full_name || "").trim().split(' ');
        const firstName = nameParts[0] || "";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";
        // Strip country prefix from stored phone to get local number
        let localPhone = "";
        if (user.phone) {
          const phoneDigits = user.phone.replace(/\D/g, "");
          const prefix = getCountryPrefix(savedCountryCode).replace("+", "");
          localPhone = phoneDigits.startsWith(prefix) ? phoneDigits.slice(prefix.length) : phoneDigits;
          localPhone = formatLocalPhone(localPhone, savedCountryCode);
        }
        setProfile({
          firstName,
          lastName,
          email: user.email || "",
          phone: localPhone,
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

  // Load notification preferences from backend
  useEffect(() => {
    if (activeStep === "notifications") {
      const fetchPreferences = async () => {
        try {
          const { preferences } = await notificationsApi.getPreferences();
          setNotifications({
            emailNotifications: Object.values(preferences).every(p => p.emailEnabled),
            transactionAlerts: preferences.transaction_alert?.enabled ?? true,
            goalReminders: preferences.goal_milestone?.enabled ?? true,
            weeklySummary: preferences.report_ready?.enabled ?? true,
            marketingEmails: preferences.system_announcement?.enabled ?? false,
          });
        } catch (error) {
          console.error("Failed to load notification preferences:", error);
        }
      };
      fetchPreferences();
    }
  }, [activeStep]);

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
      toast({ title: t('common:error'), description: t('settings:profile.phoneError'), variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      // Combine country prefix + local number for storage
      const prefix = getCountryPrefix(profile.countryCode).replace("+", "");
      const fullPhone = localDigits ? prefix + localDigits : undefined;
      await userApi.updateProfile({
        full_name: getFullName(),
        phone: fullPhone,
        birth_date: profile.birthDate || undefined,
        risk_profile: profile.riskProfile || undefined,
      });
      localStorage.setItem("userCountryCode", profile.countryCode);
      toast({ title: t('common:success'), description: t('settings:profile.saveSuccess'), variant: "success" });
    } catch (error: any) {
      toast({ title: t('common:error'), description: t('settings:profile.saveError'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      // Update each mapped notification type's enabled state
      const typeUpdates = Object.entries(NOTIFICATION_TYPE_MAP).map(([key, type]) =>
        notificationsApi.updatePreference(type, {
          enabled: notifications[key as keyof typeof notifications],
        })
      );

      // Update emailEnabled across all backend types based on the global email toggle
      const allTypes = [
        'account_activity', 'transaction_alert', 'investment_update',
        'report_ready', 'message_received', 'consultant_assignment',
        'consultant_invitation', 'subscription_update', 'system_announcement',
        'goal_milestone', 'connection_status',
      ];
      const emailUpdates = allTypes.map((type) =>
        notificationsApi.updatePreference(type, {
          emailEnabled: notifications.emailNotifications,
        })
      );

      await Promise.all([...typeUpdates, ...emailUpdates]);
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
      setPasswordError(t('settings:password.changeError'));
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
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 min-w-0">
        {/* Sidebar navigation */}
        <div className="w-full lg:w-56 shrink-0">
          <div className="settings-card !px-3 !pt-8 !pb-3 h-full">
            <nav className="flex flex-row lg:flex-col gap-0.5 overflow-x-auto" aria-label={t('settings:ariaLabel')}>
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
                    {/* Active left border indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary hidden lg:block" />
                    )}
                    {/* Active bottom border for mobile */}
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
                {t('settings:tabs.helpSupport')}
              </button>

              {/* Sign Out */}
              <button
                onClick={logout}
                className="relative text-left px-4 py-2.5 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors shrink-0 lg:shrink flex items-center gap-2 rounded-md hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                {t('settings:tabs.signOut')}
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pt-2 lg:pt-0 flex flex-col">
          {activeStep === "profile" && (
            <div className="settings-card flex-1">
              {/* Profile title */}
              <h1 className="text-xl font-semibold text-foreground mb-6">{t('settings:tabs.profile')}</h1>

              {/* Avatar header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {getUserInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-foreground truncate">{getFullName() || t('settings:profile.namePlaceholder')}</h2>
                  <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border/50 mb-6" />

              {/* Personal Information section */}
              <div className="flex items-center gap-2 mb-1">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">{t('settings:profile.title')}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t('settings:profile.subtitle')}</p>

              <div className="space-y-5">
                {/* 2-column grid: First Name / Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('settings:profile.firstName')}</Label>
                    <Input id="firstName" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} placeholder={t('settings:profile.firstNamePlaceholder')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('settings:profile.lastName')}</Label>
                    <Input id="lastName" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} placeholder={t('settings:profile.lastNamePlaceholder')} />
                  </div>
                </div>

                {/* Email full-width */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t('settings:profile.email')}</Label>
                  <Input id="email" value={profile.email} disabled className="bg-muted/50" />
                  <p className="text-xs text-muted-foreground">{t('settings:profile.emailHint')}</p>
                </div>

                {/* 2-column grid: Phone / Birth Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('settings:profile.phone')}</Label>
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
                        placeholder={profile.countryCode === "BR" ? "(XX) XXXXX-XXXX" : t('settings:profile.phonePlaceholder')}
                        className="flex-1 bg-transparent px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none md:text-sm min-w-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">{t('settings:profile.birthDate')}</Label>
                    <Input id="birthDate" type="date" value={profile.birthDate} onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })} />
                  </div>
                </div>

                {/* Currency selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="currency">{t('settings:profile.currency')}</Label>
                    <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">{t('settings:profile.currencyOptions.BRL')}</SelectItem>
                        <SelectItem value="USD">{t('settings:profile.currencyOptions.USD')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('settings:profile.currencyHint')}</p>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? t('settings:profile.saving') : t('settings:profile.saveChanges')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeStep === "notifications" && (
            <div className="settings-card flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-6">{t('settings:tabs.notifications')}</h1>
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">{t('settings:notifications.title')}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t('settings:notifications.subtitle')}</p>
              <div className="space-y-5">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <Label htmlFor={key} className="text-sm font-medium text-foreground flex-1">
                      {notificationLabels[key] || key}
                    </Label>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, [key]: checked })}
                      className="shrink-0"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-6">
                <Button onClick={handleSaveNotifications} disabled={saving}>
                  {saving ? t('settings:notifications.saving') : t('settings:notifications.saveChanges')}
                </Button>
              </div>
            </div>
          )}

          {activeStep === "password" && (
            <div className="settings-card flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-6">{t('settings:tabs.security')}</h1>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">{t('settings:password.title')}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t('settings:password.subtitle')}</p>
              <div className="space-y-5 max-w-lg">
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('settings:password.currentPassword')}</Label>
                  <Input id="currentPassword" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('settings:password.newPassword')}</Label>
                    <Input id="newPassword" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} placeholder="••••••••" />
                    <p className="text-xs text-muted-foreground">{t('settings:password.newPasswordHint')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('settings:password.confirmPassword')}</Label>
                    <Input id="confirmPassword" type="password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} placeholder="••••••••" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleChangePassword} disabled={saving}>
                    {saving ? t('settings:password.changing') : t('settings:password.changePassword')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeStep === "history" && (
            <div className="settings-card flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-6">{t('settings:tabs.history')}</h1>
              <div className="flex items-center gap-2 mb-1">
                <History className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">{t('settings:history.title')}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t('settings:history.subtitle')}</p>
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
                            <TableCell>{formatCurrency(item.priceCents / 100)}</TableCell>
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
            <div className="settings-card flex-1 min-w-0 overflow-hidden">
              <h1 className="text-xl font-semibold text-foreground mb-6">{t('settings:tabs.helpSupport')}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-base font-semibold text-foreground">{t('settings:comments.title')}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('settings:comments.subtitle')}</p>
                </div>
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
                <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-border comments-table-scrollbar">
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
