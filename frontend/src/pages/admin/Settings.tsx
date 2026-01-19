import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Mail, Palette, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [emailSettings, setEmailSettings] = useState({
    welcomeEmail: true,
    monthlyReport: true,
    alerts: true,
    fromEmail: "noreply@zurt.com.br",
    fromName: "zurT",
  });

  const [platformSettings, setPlatformSettings] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    requireEmailVerification: false,
  });

  const [customization, setCustomization] = useState({
    logo: null as File | null,
    logoPreview: null as string | null,
    primaryColor: "#3b82f6",
    platformName: "zurT",
    description: "",
  });

  const [policies, setPolicies] = useState({
    termsOfService: "",
    privacyPolicy: "",
    cookiePolicy: "",
  });

  // Load settings on mount (if API available)
  useEffect(() => {
    // For now, settings are initialized with defaults
    // In the future, load from API: adminApi.getSettings()
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomization({
        ...customization,
        logo: file,
        logoPreview: URL.createObjectURL(file),
      });
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save email settings
      await adminApi.updateEmailSettings(emailSettings);

      // Save platform settings
      await adminApi.updatePlatformSettings(platformSettings);

      // Save customization (logo upload would require multipart/form-data)
      // For now, save without logo or handle logo separately
      await adminApi.updateCustomization({
        primaryColor: customization.primaryColor,
        platformName: customization.platformName,
        description: customization.description,
      });

      // Save policies
      await adminApi.updatePolicies(policies);

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Erro",
        description: error?.error || 'Falha ao salvar configurações',
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
        case 'email':
          await adminApi.updateEmailSettings(emailSettings);
          break;
        case 'platform':
          await adminApi.updatePlatformSettings(platformSettings);
          break;
        case 'customization':
          await adminApi.updateCustomization({
            primaryColor: customization.primaryColor,
            platformName: customization.platformName,
            description: customization.description,
          });
          break;
        case 'policies':
          await adminApi.updatePolicies(policies);
          break;
      }
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error: any) {
      console.error(`Failed to save ${section} settings:`, error);
      toast({
        title: "Erro",
        description: error?.error || `Falha ao salvar configurações de ${section}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações da Plataforma</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie planos, emails, customização e políticas
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Todas as Alterações"}
        </Button>
      </div>

      <Tabs defaultValue="emails" className="space-y-6">
        <TabsList>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            Emails Automatizados
          </TabsTrigger>
          <TabsTrigger value="platform">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Configurações da Plataforma
          </TabsTrigger>
          <TabsTrigger value="customization">
            <Palette className="h-4 w-4 mr-2" />
            Customização
          </TabsTrigger>
          <TabsTrigger value="policies">
            <FileText className="h-4 w-4 mr-2" />
            Termos e Políticas
          </TabsTrigger>
        </TabsList>

        {/* Email Settings */}
        <TabsContent value="emails" className="space-y-4">
          <ChartCard title="Configurações de Email">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">Email Remetente</Label>
                  <Input
                    id="fromEmail"
                    value={emailSettings.fromEmail}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, fromEmail: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromName">Nome Remetente</Label>
                  <Input
                    id="fromName"
                    value={emailSettings.fromName}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, fromName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="welcome">Email de Boas-vindas</Label>
                    <p className="text-xs text-muted-foreground">
                      Enviar email automático quando novo usuário se registra
                    </p>
                  </div>
                  <Switch
                    id="welcome"
                    checked={emailSettings.welcomeEmail}
                    onCheckedChange={(checked) =>
                      setEmailSettings({ ...emailSettings, welcomeEmail: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="report">Relatório Mensal</Label>
                    <p className="text-xs text-muted-foreground">
                      Enviar relatório mensal automaticamente
                    </p>
                  </div>
                  <Switch
                    id="report"
                    checked={emailSettings.monthlyReport}
                    onCheckedChange={(checked) =>
                      setEmailSettings({ ...emailSettings, monthlyReport: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="alerts">Alertas por Email</Label>
                    <p className="text-xs text-muted-foreground">
                      Permitir envio de alertas por email
                    </p>
                  </div>
                  <Switch
                    id="alerts"
                    checked={emailSettings.alerts}
                    onCheckedChange={(checked) =>
                      setEmailSettings({ ...emailSettings, alerts: checked })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={() => handleSaveSection('email')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações de Email
                </Button>
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Platform Settings */}
        <TabsContent value="platform" className="space-y-4">
          <ChartCard title="Configurações da Plataforma">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance">Modo Manutenção</Label>
                  <p className="text-xs text-muted-foreground">
                    Bloqueia acesso de todos os usuários exceto administradores
                  </p>
                </div>
                <Switch
                  id="maintenance"
                  checked={platformSettings.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setPlatformSettings({ ...platformSettings, maintenanceMode: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="registrations">Permitir Registros</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite que novos usuários se registrem na plataforma
                  </p>
                </div>
                <Switch
                  id="registrations"
                  checked={platformSettings.allowRegistrations}
                  onCheckedChange={(checked) =>
                    setPlatformSettings({ ...platformSettings, allowRegistrations: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="verification">Verificação de Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Requer verificação de email para ativar conta
                  </p>
                </div>
                <Switch
                  id="verification"
                  checked={platformSettings.requireEmailVerification}
                  onCheckedChange={(checked) =>
                    setPlatformSettings({ ...platformSettings, requireEmailVerification: checked })
                  }
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={() => handleSaveSection('platform')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações da Plataforma
                </Button>
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Customization */}
        <TabsContent value="customization" className="space-y-4">
          <ChartCard title="Customização da Plataforma">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo da Plataforma</Label>
                <Input 
                  id="logo" 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                {customization.logoPreview && (
                  <div className="mt-2">
                    <img 
                      src={customization.logoPreview} 
                      alt="Logo preview" 
                      className="h-20 w-auto object-contain border border-border rounded"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Faça upload do logo que aparecerá na plataforma
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    id="primaryColor" 
                    type="color" 
                    value={customization.primaryColor}
                    onChange={(e) => setCustomization({ ...customization, primaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input 
                    value={customization.primaryColor}
                    onChange={(e) => setCustomization({ ...customization, primaryColor: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome da Plataforma</Label>
                <Input 
                  id="name" 
                  value={customization.platformName}
                  onChange={(e) => setCustomization({ ...customization, platformName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description" 
                  placeholder="Descrição da plataforma..."
                  value={customization.description}
                  onChange={(e) => setCustomization({ ...customization, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={() => handleSaveSection('customization')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Customização
                </Button>
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Policies */}
        <TabsContent value="policies" className="space-y-4">
          <ChartCard title="Termos de Uso e Políticas">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="terms">Termos de Uso</Label>
                <Textarea
                  id="terms"
                  placeholder="Digite os termos de uso..."
                  className="min-h-[200px]"
                  value={policies.termsOfService}
                  onChange={(e) => setPolicies({ ...policies, termsOfService: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privacy">Política de Privacidade</Label>
                <Textarea
                  id="privacy"
                  placeholder="Digite a política de privacidade..."
                  className="min-h-[200px]"
                  value={policies.privacyPolicy}
                  onChange={(e) => setPolicies({ ...policies, privacyPolicy: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookie">Política de Cookies</Label>
                <Textarea
                  id="cookie"
                  placeholder="Digite a política de cookies..."
                  className="min-h-[200px]"
                  value={policies.cookiePolicy}
                  onChange={(e) => setPolicies({ ...policies, cookiePolicy: e.target.value })}
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={() => handleSaveSection('policies')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Políticas
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

