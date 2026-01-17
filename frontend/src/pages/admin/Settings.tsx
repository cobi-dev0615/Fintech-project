import { useState } from "react";
import { Settings as SettingsIcon, CreditCard, Mail, Palette, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const [plans, setPlans] = useState([
    { id: "free", name: "Gratuito", price: 0, features: [] },
    { id: "basic", name: "Básico", price: 99.90, features: ["5 conexões"] },
    { id: "pro", name: "Pro", price: 299.90, features: ["Conexões ilimitadas", "Relatórios avançados"] },
    { id: "enterprise", name: "Empresarial", price: 499.90, features: ["Tudo do Pro", "API", "Suporte dedicado"] },
  ]);

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
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans">
            <CreditCard className="h-4 w-4 mr-2" />
            Planos e Preços
          </TabsTrigger>
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

        {/* Plans and Pricing */}
        <TabsContent value="plans" className="space-y-4">
          <ChartCard title="Planos e Preços">
            <div className="space-y-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{plan.name}</h3>
                        <span className="text-lg font-bold text-primary">
                          R$ {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan.features.map((feature, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Adicionar Novo Plano
              </Button>
            </div>
          </ChartCard>
        </TabsContent>

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
            </div>
          </ChartCard>
        </TabsContent>

        {/* Customization */}
        <TabsContent value="customization" className="space-y-4">
          <ChartCard title="Customização da Plataforma">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo da Plataforma</Label>
                <Input id="logo" type="file" accept="image/*" />
                <p className="text-xs text-muted-foreground">
                  Faça upload do logo que aparecerá na plataforma
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <Input id="primaryColor" type="color" defaultValue="#3b82f6" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome da Plataforma</Label>
                <Input id="name" defaultValue="zurT" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" placeholder="Descrição da plataforma..." />
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privacy">Política de Privacidade</Label>
                <Textarea
                  id="privacy"
                  placeholder="Digite a política de privacidade..."
                  className="min-h-[200px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookie">Política de Cookies</Label>
                <Textarea
                  id="cookie"
                  placeholder="Digite a política de cookies..."
                  className="min-h-[200px]"
                />
              </div>
            </div>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;

