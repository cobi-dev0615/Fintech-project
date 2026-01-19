import { useState, useEffect } from "react";
import { Settings as SettingsIcon, User, Bell, Palette, Save, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { consultantApi, userApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    specialty: "",
    cpf: "",
    cref: "",
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    clientMessages: true,
    newClients: true,
    reportReady: true,
    weeklySummary: true,
  });

  const [display, setDisplay] = useState({
    theme: "system" as "light" | "dark" | "system",
    language: "pt-BR",
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "pt-BR",
  });

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordError, setPasswordError] = useState("");

  // Load user data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await consultantApi.getProfile();
        const user = response.user;
        setProfile({
          name: user.full_name || "",
          email: user.email || "",
          phone: user.phone || "",
          bio: user.bio || "",
          specialty: user.specialty || "",
          cpf: "", // CPF is not stored in the database currently
          cref: user.cref || "",
        });
      } catch (error: any) {
        console.error("Failed to load profile:", error);
        // Fallback to localStorage if API fails
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            setProfile({
              name: user.name || user.full_name || "",
              email: user.email || "",
              phone: user.phone || "",
              bio: user.bio || "",
              specialty: user.specialty || "",
              cpf: user.cpf || "",
              cref: user.cref || "",
            });
          }
        } catch (e) {
          console.error("Failed to load from localStorage:", e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save profile via API
      await consultantApi.updateProfile({
        full_name: profile.name,
        phone: profile.phone || undefined,
        cref: profile.cref || undefined,
        specialty: profile.specialty || undefined,
        bio: profile.bio || undefined,
      });
      
      // Save notifications and display to localStorage (these don't have backend endpoints yet)
      localStorage.setItem("consultantNotifications", JSON.stringify(notifications));
      localStorage.setItem("consultantDisplay", JSON.stringify(display));

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Erro",
        description: error?.error || "Falha ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSection = async (section: string) => {
    setSaving(true);
    try {
      switch (section) {
        case "profile":
          await consultantApi.updateProfile({
            full_name: profile.name,
            phone: profile.phone || undefined,
            cref: profile.cref || undefined,
            specialty: profile.specialty || undefined,
            bio: profile.bio || undefined,
          });
          break;
        case "notifications":
          localStorage.setItem("consultantNotifications", JSON.stringify(notifications));
          break;
        case "display":
          localStorage.setItem("consultantDisplay", JSON.stringify(display));
          break;
        case "password":
          // Validate passwords
          if (!password.currentPassword || !password.newPassword || !password.confirmPassword) {
            setPasswordError("Todos os campos são obrigatórios");
            setSaving(false);
            return;
          }
          if (password.newPassword.length < 6) {
            setPasswordError("A nova senha deve ter pelo menos 6 caracteres");
            setSaving(false);
            return;
          }
          if (password.newPassword !== password.confirmPassword) {
            setPasswordError("As senhas não coincidem");
            setSaving(false);
            return;
          }
          await userApi.changePassword({
            currentPassword: password.currentPassword,
            newPassword: password.newPassword,
          });
          setPassword({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          setPasswordError("");
          break;
      }
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error: any) {
      console.error(`Failed to save ${section} settings:`, error);
      if (section === "password") {
        setPasswordError(error?.error || "Falha ao alterar senha. Verifique se a senha atual está correta.");
        toast({
          title: "Erro",
          description: error?.error || "Falha ao alterar senha. Verifique se a senha atual está correta.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: error?.error || `Falha ao salvar configurações de ${section}`,
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gerencie seu perfil, notificações e preferências de exibição
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Todas as Alterações"}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="display">
            <Palette className="h-4 w-4 mr-2" />
            Exibição
          </TabsTrigger>
          <TabsTrigger value="password">
            <Lock className="h-4 w-4 mr-2" />
            Senha
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <ChartCard title="Informações do Perfil">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Carregando informações do perfil...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    placeholder="seu@email.com"
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={profile.cpf}
                    onChange={(e) => setProfile({ ...profile, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cref">CREF (Código de Registro)</Label>
                  <Input
                    id="cref"
                    value={profile.cref}
                    onChange={(e) => setProfile({ ...profile, cref: e.target.value })}
                    placeholder="CREF-00000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidade</Label>
                  <Input
                    id="specialty"
                    value={profile.specialty}
                    onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                    placeholder="Ex: Planejamento Financeiro, Investimentos"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Descreva sua experiência profissional e especialidades..."
                  rows={4}
                />
              </div>

                <div className="flex justify-end">
                  <Button onClick={() => handleSaveSection("profile")} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Perfil
                  </Button>
                </div>
              </div>
            )}
          </ChartCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <ChartCard title="Preferências de Notificações">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">Notificações por E-mail</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Receba notificações importantes por e-mail
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="clientMessages">Mensagens de Clientes</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Notifique-me quando um cliente enviar uma mensagem
                  </p>
                </div>
                <Switch
                  id="clientMessages"
                  checked={notifications.clientMessages}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, clientMessages: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="newClients">Novos Clientes</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Notifique-me quando um novo cliente for atribuído
                  </p>
                </div>
                <Switch
                  id="newClients"
                  checked={notifications.newClients}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, newClients: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reportReady">Relatórios Prontos</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Notifique-me quando um relatório estiver pronto para download
                  </p>
                </div>
                <Switch
                  id="reportReady"
                  checked={notifications.reportReady}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, reportReady: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weeklySummary">Resumo Semanal</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Receba um resumo semanal das atividades
                  </p>
                </div>
                <Switch
                  id="weeklySummary"
                  checked={notifications.weeklySummary}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, weeklySummary: checked })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSaveSection("notifications")} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Notificações
                </Button>
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display">
          <ChartCard title="Preferências de Exibição">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Tema</Label>
                <select
                  id="theme"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={display.theme}
                  onChange={(e) =>
                    setDisplay({ ...display, theme: e.target.value as "light" | "dark" | "system" })
                  }
                >
                  <option value="system">Sistema</option>
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Escolha o tema de exibição da plataforma
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <select
                  id="language"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={display.language}
                  onChange={(e) => setDisplay({ ...display, language: e.target.value })}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Idioma de exibição da interface
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Formato de Data</Label>
                <select
                  id="dateFormat"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={display.dateFormat}
                  onChange={(e) => setDisplay({ ...display, dateFormat: e.target.value })}
                >
                  <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                  <option value="MM/DD/YYYY">MM/DD/AAAA</option>
                  <option value="YYYY-MM-DD">AAAA-MM-DD</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Formato preferido para exibição de datas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currencyFormat">Formato de Moeda</Label>
                <select
                  id="currencyFormat"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={display.currencyFormat}
                  onChange={(e) => setDisplay({ ...display, currencyFormat: e.target.value })}
                >
                  <option value="pt-BR">R$ 1.234,56 (Brasil)</option>
                  <option value="en-US">$1,234.56 (US)</option>
                  <option value="en-GB">£1,234.56 (UK)</option>
                  <option value="de-DE">1.234,56 € (Europa)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Formato preferido para exibição de valores monetários
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSaveSection("display")} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Exibição
                </Button>
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <ChartCard title="Alterar Senha">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={password.currentPassword}
                  onChange={(e) => {
                    setPassword({ ...password, currentPassword: e.target.value });
                    setPasswordError("");
                  }}
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={password.newPassword}
                  onChange={(e) => {
                    setPassword({ ...password, newPassword: e.target.value });
                    setPasswordError("");
                  }}
                  placeholder="Digite sua nova senha (mínimo 6 caracteres)"
                />
                <p className="text-xs text-muted-foreground">
                  A senha deve ter pelo menos 6 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={password.confirmPassword}
                  onChange={(e) => {
                    setPassword({ ...password, confirmPassword: e.target.value });
                    setPasswordError("");
                  }}
                  placeholder="Confirme sua nova senha"
                />
              </div>

              {passwordError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{passwordError}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSaveSection("password")} 
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Alterando..." : "Alterar Senha"}
                </Button>
              </div>
            </div>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;

