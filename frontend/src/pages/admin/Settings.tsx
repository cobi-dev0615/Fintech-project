import { useState } from "react";
import { Settings as SettingsIcon, Mail, Globe, DollarSign, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useCurrency, type CurrencyCode } from "@/contexts/CurrencyContext";

const FLAG_BR = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props}>
    <rect width="512" height="512" rx="64" fill="#6DA544" />
    <polygon points="256,100 462,256 256,412 50,256" fill="#FFDA44" />
    <circle cx="256" cy="256" r="90" fill="#0052B4" />
    <path
      d="M186,230c-2,8-3,17-3,26a73,73 0 0 0 1,13c40-6 83-3 120,9a73,73 0 0 0-6-35c-34-10-74-14-112-13z"
      fill="#F0F0F0"
    />
  </svg>
);

const FLAG_US = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props}>
    <rect width="512" height="512" rx="64" fill="#F0F0F0" />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <rect key={i} y={i * 78.77} width="512" height={39.38} fill="#D80027" />
    ))}
    <rect width="256" height="275.69" fill="#0052B4" />
    {[
      [48, 40], [96, 40], [144, 40], [192, 40],
      [72, 72], [120, 72], [168, 72],
      [48, 104], [96, 104], [144, 104], [192, 104],
      [72, 136], [120, 136], [168, 136],
      [48, 168], [96, 168], [144, 168], [192, 168],
      [72, 200], [120, 200], [168, 200],
      [48, 232], [96, 232], [144, 232], [192, 232],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="8" fill="#F0F0F0" />
    ))}
  </svg>
);

const LANGUAGES = [
  { code: "pt-BR", Flag: FLAG_BR },
  { code: "en", Flag: FLAG_US },
] as const;

const CURRENCIES = [
  { code: "BRL" as CurrencyCode, symbol: "R$", Flag: FLAG_BR },
  { code: "USD" as CurrencyCode, symbol: "$", Flag: FLAG_US },
] as const;

const Settings = () => {
  const { t, i18n } = useTranslation(["admin", "common", "settings"]);
  const [activeStep, setActiveStep] = useState<string>("emails");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { currency, setCurrency } = useCurrency();

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

  const [selectedLanguage, setSelectedLanguage] = useState(
    i18n.language || "pt-BR",
  );

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(
    currency,
  );

  const steps = [
    { id: "emails", label: t("admin:settings.steps.emails") },
    { id: "platform", label: t("admin:settings.steps.platform") },
    { id: "language", label: t("admin:settings.steps.language") },
  ];

  const handleSaveSection = async (section: string) => {
    setSaving(true);
    try {
      switch (section) {
        case "email":
          await adminApi.updateEmailSettings(emailSettings);
          break;
        case "platform":
          await adminApi.updatePlatformSettings(platformSettings);
          break;
        case "language":
          await adminApi.updateLanguageSettings({
            defaultLanguage: selectedLanguage,
            availableLanguages: ["pt-BR", "en"],
          });
          if (selectedLanguage !== i18n.language) {
            i18n.changeLanguage(selectedLanguage);
          }
          if (selectedCurrency !== currency) {
            setCurrency(selectedCurrency);
          }
          break;
      }
      toast({
        title: t("common:success"),
        description: section === "language"
          ? t("admin:settings.languageSettings.saveSuccess")
          : t("admin:settings.saveSuccess"),
      });
    } catch (error: any) {
      console.error(`Failed to save ${section} settings:`, error);
      toast({
        title: t("common:error"),
        description: section === "language"
          ? t("admin:settings.languageSettings.saveError")
          : t("admin:settings.saveError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 min-w-0">
        {/* Sidebar navigation */}
        <div className="w-full lg:w-56 shrink-0">
          <div className="settings-card !px-3 !pt-8 !pb-3 h-full">
            <nav
              className="flex flex-row lg:flex-col gap-0.5 overflow-x-auto"
              aria-label={t("admin:settings.title")}
            >
              {steps.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={cn(
                      "relative text-left px-4 py-2.5 text-sm font-medium transition-colors shrink-0 lg:shrink rounded-md",
                      isActive
                        ? "text-primary bg-primary/15 dark:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
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
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pt-2 lg:pt-0 flex flex-col">
          {/* Email Settings */}
          {activeStep === "emails" && (
            <div className="settings-card flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-6">
                {t("admin:settings.steps.emails")}
              </h1>

              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  {t("admin:settings.emailSettings.title")}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {t("admin:settings.subtitle")}
              </p>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">
                      {t("admin:settings.emailSettings.fromEmail")}
                    </Label>
                    <Input
                      id="fromEmail"
                      value={emailSettings.fromEmail}
                      onChange={(e) =>
                        setEmailSettings({
                          ...emailSettings,
                          fromEmail: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fromName">
                      {t("admin:settings.emailSettings.fromName")}
                    </Label>
                    <Input
                      id="fromName"
                      value={emailSettings.fromName}
                      onChange={(e) =>
                        setEmailSettings({
                          ...emailSettings,
                          fromName: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="h-px bg-border/50" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="welcome">
                        {t("admin:settings.emailSettings.welcomeEmail")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("admin:settings.emailSettings.welcomeEmailDesc")}
                      </p>
                    </div>
                    <Switch
                      id="welcome"
                      checked={emailSettings.welcomeEmail}
                      onCheckedChange={(checked) =>
                        setEmailSettings({
                          ...emailSettings,
                          welcomeEmail: checked,
                        })
                      }
                      className="shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="report">
                        {t("admin:settings.emailSettings.monthlyReport")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("admin:settings.emailSettings.monthlyReportDesc")}
                      </p>
                    </div>
                    <Switch
                      id="report"
                      checked={emailSettings.monthlyReport}
                      onCheckedChange={(checked) =>
                        setEmailSettings({
                          ...emailSettings,
                          monthlyReport: checked,
                        })
                      }
                      className="shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="alerts">
                        {t("admin:settings.emailSettings.emailAlerts")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("admin:settings.emailSettings.emailAlertsDesc")}
                      </p>
                    </div>
                    <Switch
                      id="alerts"
                      checked={emailSettings.alerts}
                      onCheckedChange={(checked) =>
                        setEmailSettings({
                          ...emailSettings,
                          alerts: checked,
                        })
                      }
                      className="shrink-0"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSaveSection("email")}
                    disabled={saving}
                  >
                    {saving
                      ? t("admin:settings.saving")
                      : t("admin:settings.emailSettings.saveButton")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Platform Settings */}
          {activeStep === "platform" && (
            <div className="settings-card flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-6">
                {t("admin:settings.steps.platform")}
              </h1>

              <div className="flex items-center gap-2 mb-1">
                <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  {t("admin:settings.platformSettings.title")}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {t("admin:settings.subtitle")}
              </p>

              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenance">
                      {t("admin:settings.platformSettings.maintenanceMode")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "admin:settings.platformSettings.maintenanceModeDesc",
                      )}
                    </p>
                  </div>
                  <Switch
                    id="maintenance"
                    checked={platformSettings.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setPlatformSettings({
                        ...platformSettings,
                        maintenanceMode: checked,
                      })
                    }
                    className="shrink-0"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="registrations">
                      {t(
                        "admin:settings.platformSettings.allowRegistrations",
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "admin:settings.platformSettings.allowRegistrationsDesc",
                      )}
                    </p>
                  </div>
                  <Switch
                    id="registrations"
                    checked={platformSettings.allowRegistrations}
                    onCheckedChange={(checked) =>
                      setPlatformSettings({
                        ...platformSettings,
                        allowRegistrations: checked,
                      })
                    }
                    className="shrink-0"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="verification">
                      {t(
                        "admin:settings.platformSettings.emailVerification",
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "admin:settings.platformSettings.emailVerificationDesc",
                      )}
                    </p>
                  </div>
                  <Switch
                    id="verification"
                    checked={platformSettings.requireEmailVerification}
                    onCheckedChange={(checked) =>
                      setPlatformSettings({
                        ...platformSettings,
                        requireEmailVerification: checked,
                      })
                    }
                    className="shrink-0"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSaveSection("platform")}
                    disabled={saving}
                  >
                    {saving
                      ? t("admin:settings.saving")
                      : t("admin:settings.platformSettings.saveButton")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Language & Currency Settings */}
          {activeStep === "language" && (
            <div className="settings-card flex-1">
              <h1 className="text-xl font-semibold text-foreground mb-6">
                {t("admin:settings.steps.language")}
              </h1>

              {/* Language Section */}
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  {t("admin:settings.languageSettings.title")}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {t("admin:settings.languageSettings.defaultLanguageDesc")}
              </p>

              <div className="space-y-5">
                {/* Default Language Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LANGUAGES.map((lang) => {
                    const isSelected = selectedLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setSelectedLanguage(lang.code)}
                        className={cn(
                          "relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-border hover:border-primary/40 hover:bg-muted/30",
                        )}
                      >
                        <lang.Flag className="h-8 w-8 rounded-sm shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {t(`admin:settings.languageSettings.languages.${lang.code}`)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lang.code}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="h-px bg-border/50" />

                {/* Currency Section */}
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-base font-semibold text-foreground">
                    {t("admin:settings.currencySettings.title")}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("admin:settings.currencySettings.subtitle")}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CURRENCIES.map((curr) => {
                    const isSelected = selectedCurrency === curr.code;
                    return (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => setSelectedCurrency(curr.code)}
                        className={cn(
                          "relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-border hover:border-primary/40 hover:bg-muted/30",
                        )}
                      >
                        <curr.Flag className="h-8 w-8 rounded-sm shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {t(`settings:profile.currencyOptions.${curr.code}`)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {curr.symbol}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSaveSection("language")}
                    disabled={saving}
                  >
                    {saving
                      ? t("admin:settings.saving")
                      : t("admin:settings.languageSettings.saveButton")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
