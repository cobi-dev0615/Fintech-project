import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Mail, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Settings = () => {
  const [activeStep, setActiveStep] = useState<string>("emails");
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

  const steps = [
    { id: "emails", label: "Emails Automatizados", icon: Mail },
    { id: "platform", label: "Configurações da Plataforma", icon: SettingsIcon },
  ];

  // Load settings on mount (if API available)
  useEffect(() => {
    // For now, settings are initialized with defaults
    // In the future, load from API: adminApi.getSettings()
  }, []);

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
          <h1 className="text-2xl font-bold text-foreground">Configurações da Plataforma</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie emails e configurações da plataforma
          </p>
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
                      Passo {index + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {/* Email Settings */}
          {activeStep === "emails" && (
            <ChartCard 
              title="Configurações de Email"
              actions={<Button onClick={() => handleSaveSection('email')} disabled={saving} size="sm"><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar Configurações de Email"}</Button>}
            >
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
                      className="data-[state=checked]:bg-success"
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
                      className="data-[state=checked]:bg-success"
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
                      className="data-[state=checked]:bg-success"
                    />
                  </div>
                </div>
              </div>
            </ChartCard>
          )}

          {/* Platform Settings */}
          {activeStep === "platform" && (
            <ChartCard 
              title="Configurações da Plataforma"
              actions={<Button onClick={() => handleSaveSection('platform')} disabled={saving} size="sm"><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar Configurações da Plataforma"}</Button>}
            >
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
                    className="data-[state=checked]:bg-success"
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
                    className="data-[state=checked]:bg-success"
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
                    className="data-[state=checked]:bg-success"
                  />
                </div>
              </div>
            </ChartCard>
          )}


        </div>
      </div>
    </div>
  );
};

export default Settings;
