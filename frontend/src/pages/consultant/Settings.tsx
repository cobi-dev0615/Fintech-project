import { useState, useEffect } from "react";
import {
  User,
  Bell,
  Save,
  Lock,
  ChevronRight,
  History,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Loader2,
  Trash2,
  Eye,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
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

const Settings = () => {
  const { t, i18n } = useTranslation(['consultant', 'common']);
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;

  const [activeStep, setActiveStep] = useState<string>("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "+55 ",
    countryCode: "BR",
    bio: "",
    specialty: "",
    cref: "",
  });

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    let formatted = digits;
    if (!formatted.startsWith("55")) {
      formatted = "55" + formatted;
    }
    formatted = formatted.slice(0, 13);
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

  const steps = [
    { id: "profile", label: t('consultant:settings.steps.profile'), icon: User },
    { id: "notifications", label: t('consultant:settings.steps.notifications'), icon: Bell },
    { id: "password", label: t('consultant:settings.steps.password'), icon: Lock },
    { id: "history", label: t('consultant:settings.steps.history'), icon: History },
    { id: "comments", label: t('consultant:settings.steps.comments'), icon: MessageSquare },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await consultantApi.getProfile();
        const user = response.user;
        const savedCountryCode = localStorage.getItem("consultantCountryCode") || "BR";
        setProfile({
          name: user.full_name || "",
          email: user.email || "",
          phone: user.phone ? formatPhone(user.phone) : "+55 ",
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
    if (profile.phone && !validatePhone(profile.phone)) {
      toast({ title: t('common:error'), description: t('consultant:settings.profile.phoneError'), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await consultantApi.updateProfile({
        full_name: profile.name,
        phone: profile.phone ? profile.phone.replace(/\D/g, "") : undefined,
        cref: profile.cref || undefined,
        specialty: profile.specialty || undefined,
        bio: profile.bio || undefined,
      });
      localStorage.setItem("consultantCountryCode", profile.countryCode);
      toast({ title: t('common:success'), description: t('consultant:settings.profile.updateSuccess'), variant: "success" });
    } catch (error: any) {
      toast({ title: t('common:error'), description: error?.error || t('consultant:settings.profile.updateError'), variant: "destructive" });
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
      setPasswordError(error?.error || t('consultant:settings.password.changeError'));
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('consultant:settings.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('consultant:settings.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Vertical Step Bar (Skewer Style) */}
        <div className="w-full lg:w-64 relative h-fit">
          {/* Vertical Skewer Line */}
          <div className="absolute left-6 top-6 bottom-6 w-px bg-border hidden lg:block z-0" />
          
          <div className="flex flex-col gap-6 relative z-10">
            {steps.map((step, index) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className="flex items-center group relative w-full text-left"
                >
                  {/* Step Circle */}
                  <div className={cn(
                    "flex items-center justify-center h-12 w-12 rounded-full border-2 transition-all duration-200 shrink-0 bg-[#020817] z-20",
                    isActive 
                      ? "border-success text-success shadow-[0_0_15px_rgba(34,197,94,0.2)]" 
                      : "border-border text-muted-foreground group-hover:border-success/50"
                  )}>
                    <step.icon className="h-5 w-5" />
                  </div>

                  {/* Step Info */}
                  <div className="ml-4 flex flex-col">
                    <span className={cn(
                      "font-semibold text-sm transition-colors duration-200 uppercase tracking-tight",
                      isActive ? "text-success" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {step.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                      {t('consultant:settings.step', { number: index + 1 })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeStep === "profile" && (
            <ChartCard
              title={t('consultant:settings.profile.title')}
              actions={<Button onClick={handleSaveProfile} disabled={saving} size="sm"><Save className="h-4 w-4 mr-2" />{saving ? t('consultant:settings.profile.saving') : t('consultant:settings.profile.save')}</Button>}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="name">{t('consultant:settings.profile.fullName')}</Label><Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="email">{t('consultant:settings.profile.email')}</Label><Input id="email" value={profile.email} disabled className="bg-muted" /></div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('consultant:settings.profile.phone')}</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: formatPhone(e.target.value) })}
                      placeholder={t('consultant:settings.profile.phonePlaceholder')}
                      className="flex-1"
                    />
                  </div>
                  <div className="space-y-2"><Label htmlFor="cref">{t('consultant:settings.profile.cref')}</Label><Input id="cref" value={profile.cref} onChange={(e) => setProfile({ ...profile, cref: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="specialty">{t('consultant:settings.profile.specialty')}</Label><Input id="specialty" value={profile.specialty} onChange={(e) => setProfile({ ...profile, specialty: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="bio">{t('consultant:settings.profile.bio')}</Label><Textarea id="bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} /></div>
              </div>
            </ChartCard>
          )}

          {activeStep === "notifications" && (
            <ChartCard
              title={t('consultant:settings.notifications.title')}
              actions={<Button onClick={handleSaveNotifications} disabled={saving} size="sm"><Save className="h-4 w-4 mr-2" />{saving ? t('consultant:settings.notifications.saving') : t('consultant:settings.notifications.save')}</Button>}
            >
              <div className="space-y-8 py-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm font-medium text-foreground/80">{t(`consultant:settings.notifications.${key}`)}</Label>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, [key]: checked })}
                      className="data-[state=checked]:bg-success"
                    />
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {activeStep === "password" && (
            <ChartCard
              title={t('consultant:settings.password.title')}
              actions={<Button onClick={handleChangePassword} disabled={saving} size="sm"><Lock className="h-4 w-4 mr-2" />{saving ? t('consultant:settings.password.changing') : t('consultant:settings.password.change')}</Button>}
            >
              <div className="space-y-4">
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                <div className="space-y-2"><Label htmlFor="currentPassword">{t('consultant:settings.password.current')}</Label><Input id="currentPassword" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="newPassword">{t('consultant:settings.password.new')}</Label><Input id="newPassword" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="confirmPassword">{t('consultant:settings.password.confirm')}</Label><Input id="confirmPassword" type="password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} /></div>
              </div>
            </ChartCard>
          )}

          {activeStep === "history" && (
            <ChartCard title={t('consultant:settings.history.title')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('consultant:settings.history.plan')}</TableHead>
                    <TableHead>{t('consultant:settings.history.date')}</TableHead>
                    <TableHead>{t('consultant:settings.history.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8">{t('consultant:settings.history.loading')}</TableCell></TableRow>
                  ) : history.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t('consultant:settings.history.empty')}</TableCell></TableRow>
                  ) : (
                    history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.planName}</TableCell>
                        <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy", { locale: dateLocale })}</TableCell>
                        <TableCell><span className={cn("px-2 py-1 rounded-full text-xs font-medium", item.status === 'active' ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{t(`common:status.${item.status}`, { defaultValue: item.status })}</span></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ChartCard>
          )}

          {activeStep === "comments" && (
            <ChartCard
              title={t('consultant:settings.feedback.title')}
              actions={
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
              }
            >
              <div className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {commentsLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8">{t('consultant:settings.feedback.loading')}</TableCell></TableRow>
                    ) : comments.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('consultant:settings.feedback.noFeedback')}</TableCell></TableRow>
                    ) : (
                      comments.map((c, index) => (
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
                      ))
                    )}
                  </TableBody>
                </Table>

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
              </div>
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
