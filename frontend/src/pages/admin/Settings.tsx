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
import { useTranslation } from "react-i18next";

const Settings = () => {
  const { t } = useTranslation(['admin', 'common']);
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
    { id: "emails", label: t('admin:settings.steps.emails'), icon: Mail },
    { id: "platform", label: t('admin:settings.steps.platform'), icon: SettingsIcon },
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
        title: t('common:success'),
        description: t('admin:settings.saveSuccess'),
      });
    } catch (error: any) {
      console.error(`Failed to save ${section} settings:`, error);
      toast({
        title: t('common:error'),
        description: error?.error || t('admin:settings.saveError'),
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
          <h1 className="text-2xl font-bold text-foreground">{t('admin:settings.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin:settings.subtitle')}
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
                      {t('admin:settings.step', { number: index + 1 })}
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
              title={t('admin:settings.emailSettings.title')}
              actions={<Button onClick={() => handleSaveSection('email')} disabled={saving} size="sm"><Save className="h-4 w-4 mr-2" />{saving ? t('admin:settings.saving') : t('admin:settings.emailSettings.saveButton')}</Button>}
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">{t('admin:settings.emailSettings.fromEmail')}</Label>
                    <Input
                      id="fromEmail"
                      value={emailSettings.fromEmail}
                      onChange={(e) =>
                        setEmailSettings({ ...emailSettings, fromEmail: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fromName">{t('admin:settings.emailSettings.fromName')}</Label>
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
                      <Label htmlFor="welcome">{t('admin:settings.emailSettings.welcomeEmail')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('admin:settings.emailSettings.welcomeEmailDesc')}
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
                      <Label htmlFor="report">{t('admin:settings.emailSettings.monthlyReport')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('admin:settings.emailSettings.monthlyReportDesc')}
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
                      <Label htmlFor="alerts">{t('admin:settings.emailSettings.emailAlerts')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('admin:settings.emailSettings.emailAlertsDesc')}
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
              title={t('admin:settings.platformSettings.title')}
              actions={<Button onClick={() => handleSaveSection('platform')} disabled={saving} size="sm"><Save className="h-4 w-4 mr-2" />{saving ? t('admin:settings.saving') : t('admin:settings.platformSettings.saveButton')}</Button>}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenance">{t('admin:settings.platformSettings.maintenanceMode')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('admin:settings.platformSettings.maintenanceModeDesc')}
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
                    <Label htmlFor="registrations">{t('admin:settings.platformSettings.allowRegistrations')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('admin:settings.platformSettings.allowRegistrationsDesc')}
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
                    <Label htmlFor="verification">{t('admin:settings.platformSettings.emailVerification')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('admin:settings.platformSettings.emailVerificationDesc')}
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
