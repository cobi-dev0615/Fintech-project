import { useState, useEffect } from "react";
import { Bell, Mail, Smartphone, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { notificationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type NotificationType =
  | 'account_activity'
  | 'transaction_alert'
  | 'investment_update'
  | 'report_ready'
  | 'message_received'
  | 'consultant_assignment'
  | 'subscription_update'
  | 'system_announcement'
  | 'goal_milestone'
  | 'connection_status';

interface NotificationPreference {
  enabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

const notificationTypeKeys: NotificationType[] = [
  'account_activity',
  'transaction_alert',
  'investment_update',
  'report_ready',
  'message_received',
  'consultant_assignment',
  'subscription_update',
  'system_announcement',
  'goal_milestone',
  'connection_status',
];

export default function NotificationSettings() {
  const { t } = useTranslation(['notifications', 'common']);
  const [preferences, setPreferences] = useState<Record<NotificationType, NotificationPreference>>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changedTypes, setChangedTypes] = useState<Set<NotificationType>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.getPreferences();
      setPreferences(response.preferences as Record<NotificationType, NotificationPreference>);
    } catch (error: any) {
      toast({
        title: t('common:error'),
        description: t('notifications:preferences.loadError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (
    type: NotificationType,
    field: 'enabled' | 'emailEnabled' | 'pushEnabled',
    value: boolean
  ) => {
    if (!preferences) return;

    setPreferences((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        [type]: {
          ...prev[type],
          [field]: value,
        },
      };
      return updated;
    });

    setChangedTypes((prev) => new Set(prev).add(type));
  };

  const savePreferences = async () => {
    if (!preferences || changedTypes.size === 0) return;

    try {
      setSaving(true);
      const savePromises = Array.from(changedTypes).map((type) =>
        notificationsApi.updatePreference(type, preferences[type])
      );

      await Promise.all(savePromises);
      setChangedTypes(new Set());

      toast({
        title: t('common:success'),
        description: t('notifications:preferences.saveSuccess'),
      });
    } catch (error: any) {
      toast({
        title: t('common:error'),
        description: t('notifications:preferences.saveError'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('notifications:preferences.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('notifications:preferences.subtitle')}
          </p>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-96" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('notifications:preferences.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('notifications:preferences.subtitle')}
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">{t('notifications:preferences.couldNotLoadPrefs')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('notifications:preferences.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('notifications:preferences.subtitle')}
          </p>
        </div>
        {changedTypes.size > 0 && (
          <Button onClick={savePreferences} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('notifications:preferences.saving') : t('notifications:preferences.saveChanges')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('notifications:preferences.cardTitle')}</CardTitle>
          <CardDescription>
            {t('notifications:preferences.cardDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationTypeKeys.map((type, index) => {
            const pref = preferences[type];
            const label = t(`notifications:preferences.types.${type}.label`);
            const description = t(`notifications:preferences.types.${type}.description`);
            const hasChanges = changedTypes.has(type);

            return (
              <div key={type}>
                {index > 0 && <Separator className="my-6" />}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{label}</h3>
                        {hasChanges && (
                          <span className="text-xs text-primary font-medium">{t('notifications:preferences.unsaved')}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pl-4">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={`${type}-enabled`} className="cursor-pointer">
                          {t('notifications:preferences.enableNotifications')}
                        </Label>
                      </div>
                      <Switch
                        id={`${type}-enabled`}
                        checked={pref.enabled}
                        onCheckedChange={(checked) => updatePreference(type, 'enabled', checked)}
                      />
                    </div>

                    {/* Email Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={`${type}-email`} className="cursor-pointer">
                          {t('notifications:preferences.emailNotifications')}
                        </Label>
                      </div>
                      <Switch
                        id={`${type}-email`}
                        checked={pref.enabled && pref.emailEnabled}
                        disabled={!pref.enabled}
                        onCheckedChange={(checked) => updatePreference(type, 'emailEnabled', checked)}
                      />
                    </div>

                    {/* Push/In-App Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={`${type}-push`} className="cursor-pointer">
                          {t('notifications:preferences.inAppNotifications')}
                        </Label>
                      </div>
                      <Switch
                        id={`${type}-push`}
                        checked={pref.enabled && pref.pushEnabled}
                        disabled={!pref.enabled}
                        onCheckedChange={(checked) => updatePreference(type, 'pushEnabled', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
