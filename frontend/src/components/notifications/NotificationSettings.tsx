import { useState, useEffect } from "react";
import { Bell, Mail, Smartphone, Save } from "lucide-react";
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

const notificationTypeLabels: Record<NotificationType, { label: string; description: string }> = {
  account_activity: {
    label: 'Atividade da Conta',
    description: 'Notificações sobre mudanças na sua conta',
  },
  transaction_alert: {
    label: 'Alertas de Transação',
    description: 'Notificações sobre transações importantes',
  },
  investment_update: {
    label: 'Atualizações de Investimentos',
    description: 'Notificações sobre mudanças nos seus investimentos',
  },
  report_ready: {
    label: 'Relatórios Prontos',
    description: 'Notificações quando seus relatórios estiverem prontos',
  },
  message_received: {
    label: 'Mensagens Recebidas',
    description: 'Notificações quando você receber mensagens',
  },
  consultant_assignment: {
    label: 'Atribuição de Consultor',
    description: 'Notificações sobre atribuições de consultores',
  },
  subscription_update: {
    label: 'Atualizações de Assinatura',
    description: 'Notificações sobre mudanças na sua assinatura',
  },
  system_announcement: {
    label: 'Anúncios do Sistema',
    description: 'Notificações sobre atualizações e anúncios do sistema',
  },
  goal_milestone: {
    label: 'Marcos de Metas',
    description: 'Notificações quando você atingir marcos nas suas metas',
  },
  connection_status: {
    label: 'Status de Conexão',
    description: 'Notificações sobre o status das suas conexões bancárias',
  },
};

export default function NotificationSettings() {
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
        title: "Erro",
        description: "Não foi possível carregar as preferências de notificação.",
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
        title: "Sucesso",
        description: "Preferências de notificação salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências de notificação.",
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
          <h1 className="text-3xl font-bold text-foreground">Configurações de Notificações</h1>
          <p className="text-muted-foreground mt-1">
            Configure quais notificações você deseja receber
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
          <h1 className="text-3xl font-bold text-foreground">Configurações de Notificações</h1>
          <p className="text-muted-foreground mt-1">
            Configure quais notificações você deseja receber
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Não foi possível carregar as preferências.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const notificationTypes = Object.keys(notificationTypeLabels) as NotificationType[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações de Notificações</h1>
          <p className="text-muted-foreground mt-1">
            Configure quais notificações você deseja receber
          </p>
        </div>
        {changedTypes.size > 0 && (
          <Button onClick={savePreferences} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificação</CardTitle>
          <CardDescription>
            Ative ou desative os tipos de notificação que você deseja receber. Você pode controlar
            notificações no aplicativo e por e-mail separadamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationTypes.map((type, index) => {
            const pref = preferences[type];
            const { label, description } = notificationTypeLabels[type];
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
                          <span className="text-xs text-primary font-medium">(não salvo)</span>
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
                          Ativar notificações
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
                          Notificações por e-mail
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
                          Notificações no aplicativo
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
