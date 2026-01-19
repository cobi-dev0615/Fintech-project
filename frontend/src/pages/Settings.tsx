import { useState, useEffect } from "react";
import { Settings as SettingsIcon, User, Bell, Palette, Save, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { userApi, authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    riskProfile: "",
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    transactionAlerts: true,
    goalReminders: true,
    weeklySummary: true,
    marketingEmails: false,
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
        const response = await authApi.me();
        const user = response.user;
        setProfile({
          name: user.full_name || "",
          email: user.email || "",
          phone: user.phone || "",
          birthDate: user.birth_date || "",
          riskProfile: user.risk_profile || "",
        });
      } catch (error: any) {
        console.error("Failed to load profile:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar perfil",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [toast]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await userApi.updateProfile({
        full_name: profile.name,
        phone: profile.phone || undefined,
        birth_date: profile.birthDate || undefined,
        risk_profile: profile.riskProfile || undefined,
      });
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.error || "Erro ao atualizar perfil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    if (!password.currentPassword || !password.newPassword) {
      setPasswordError("Preencha todos os campos");
      return;
    }

    if (password.newPassword !== password.confirmPassword) {
      setPasswordError("As senhas não coincidem");
      return;
    }

    if (password.newPassword.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      await userApi.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso",
      });
      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      setPasswordError(error?.error || "Erro ao alterar senha");
      toast({
        title: "Erro",
        description: error?.error || "Erro ao alterar senha",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas preferências e informações pessoais
          </p>
        </div>
        <Button onClick={handleSaveProfile} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
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
          <ChartCard title="Informações Pessoais">
            <div className="space-y-4">
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
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="riskProfile">Perfil de Risco</Label>
                <Input
                  id="riskProfile"
                  value={profile.riskProfile}
                  onChange={(e) => setProfile({ ...profile, riskProfile: e.target.value })}
                  placeholder="Conservador, Moderado, Arrojado"
                />
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <ChartCard title="Preferências de Notificação">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">Notificações por E-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações importantes por e-mail
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
                  <Label htmlFor="transactionAlerts">Alertas de Transações</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber alertas sobre transações importantes
                  </p>
                </div>
                <Switch
                  id="transactionAlerts"
                  checked={notifications.transactionAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, transactionAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="goalReminders">Lembretes de Metas</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber lembretes sobre suas metas financeiras
                  </p>
                </div>
                <Switch
                  id="goalReminders"
                  checked={notifications.goalReminders}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, goalReminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weeklySummary">Resumo Semanal</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber um resumo semanal das suas finanças
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketingEmails">E-mails de Marketing</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber ofertas e novidades por e-mail
                  </p>
                </div>
                <Switch
                  id="marketingEmails"
                  checked={notifications.marketingEmails}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, marketingEmails: checked })
                  }
                />
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={display.theme}
                  onChange={(e) =>
                    setDisplay({
                      ...display,
                      theme: e.target.value as "light" | "dark" | "system",
                    })
                  }
                >
                  <option value="system">Sistema</option>
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <select
                  id="language"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={display.language}
                  onChange={(e) => setDisplay({ ...display, language: e.target.value })}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Formato de Data</Label>
                <select
                  id="dateFormat"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={display.dateFormat}
                  onChange={(e) => setDisplay({ ...display, dateFormat: e.target.value })}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currencyFormat">Formato de Moeda</Label>
                <select
                  id="currencyFormat"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={display.currencyFormat}
                  onChange={(e) => setDisplay({ ...display, currencyFormat: e.target.value })}
                >
                  <option value="pt-BR">R$ (Brasil)</option>
                  <option value="en-US">$ (US)</option>
                </select>
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <ChartCard title="Alterar Senha">
            <div className="space-y-4">
              {passwordError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{passwordError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={password.currentPassword}
                  onChange={(e) =>
                    setPassword({ ...password, currentPassword: e.target.value })
                  }
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={password.newPassword}
                  onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
                  placeholder="Digite sua nova senha"
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
                  onChange={(e) =>
                    setPassword({ ...password, confirmPassword: e.target.value })
                  }
                  placeholder="Confirme sua nova senha"
                />
              </div>

              <Button onClick={handleChangePassword} disabled={saving} className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                {saving ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;

