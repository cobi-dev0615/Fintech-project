import { useState, useEffect } from "react";
import { Check, CreditCard, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { publicApi, subscriptionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Plan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  connectionLimit: number | null;
  features: string[];
  isActive: boolean;
}

interface CurrentSubscription {
  id: string;
  status: string;
  plan: {
    id: string;
    code: string;
    name: string;
  };
}

const PlanPurchase = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansResponse, subscriptionResponse] = await Promise.all([
        publicApi.getPlans(),
        subscriptionsApi.getMySubscription().catch(() => ({ subscription: null })),
      ]);

      setPlans(plansResponse.plans);
      if (subscriptionResponse.subscription) {
        setCurrentSubscription({
          id: subscriptionResponse.subscription.id,
          status: subscriptionResponse.subscription.status,
          plan: subscriptionResponse.subscription.plan,
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast({
        title: "Erro",
        description: error?.error || 'Falha ao carregar planos',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = (planId: string) => {
    // Don't allow purchasing the same plan
    if (currentSubscription?.plan.id === planId && currentSubscription.status === 'active') {
      toast({
        title: "Plano já ativo",
        description: "Você já possui este plano ativo.",
        variant: "default",
      });
      return;
    }

    setSelectedPlanId(planId);
    setShowConfirmDialog(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPlanId) return;

    try {
      setPurchasing(selectedPlanId);
      const response = await subscriptionsApi.createSubscription(selectedPlanId);

      toast({
        title: "Sucesso!",
        description: `Plano ${response.subscription.plan.name} ativado com sucesso!`,
        variant: "default",
      });

      // Update current subscription
      setCurrentSubscription({
        id: response.subscription.id,
        status: response.subscription.status,
        plan: response.subscription.plan,
      });

      setShowConfirmDialog(false);
      setSelectedPlanId(null);

      // Redirect to dashboard after a short delay (based on current route)
      setTimeout(() => {
        if (location.pathname.startsWith('/consultant')) {
          navigate('/consultant/dashboard');
        } else {
          navigate('/app/dashboard');
        }
      }, 1500);
    } catch (error: any) {
      console.error('Failed to purchase plan:', error);
      toast({
        title: "Erro",
        description: error?.error || 'Falha ao assinar plano',
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Grátis';
    const reais = cents / 100;
    return `R$ ${reais.toFixed(2).replace('.', ',')}`;
  };

  const getSubtitle = (code: string) => {
    if (code === 'free') return 'Ideal para começar';
    if (code === 'basic') return 'Para quem quer mais';
    if (code === 'pro' || code === 'professional') return 'Controle total';
    return '';
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan.id === planId && currentSubscription.status === 'active';
  };

  const isFeatured = (code: string) => {
    return code === 'pro' || code === 'professional';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Escolha seu Plano</h1>
        <p className="text-muted-foreground">
          Selecione o plano que melhor se adapta às suas necessidades. Você pode alterar a qualquer momento.
        </p>
      </div>

      {currentSubscription && currentSubscription.status === 'active' && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Plano Atual
            </CardTitle>
            <CardDescription>
              Você está atualmente no plano <strong>{currentSubscription.plan.name}</strong>
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.id);
          const featured = isFeatured(plan.code);
          const isFree = plan.priceCents === 0;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col transition-all duration-300",
                featured && "border-primary shadow-lg shadow-primary/10 scale-105",
                !featured && "hover:border-primary/30",
                isCurrent && "ring-2 ring-primary"
              )}
            >
              {featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                  Mais Popular
                </div>
              )}

              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <Badge variant="default" className="bg-primary">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{getSubtitle(plan.code)}</CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(plan.priceCents)}
                    </span>
                    {!isFree && (
                      <span className="text-sm text-muted-foreground">/mês</span>
                    )}
                  </div>
                  {plan.connectionLimit !== null && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Até {plan.connectionLimit} conexões
                    </p>
                  )}
                  {plan.connectionLimit === null && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Conexões ilimitadas
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePurchaseClick(plan.id)}
                  disabled={isCurrent || purchasing !== null}
                  variant={featured ? "default" : "outline"}
                  className="w-full"
                  size="lg"
                >
                  {purchasing === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : isCurrent ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Plano Ativo
                    </>
                  ) : isFree ? (
                    "Começar Grátis"
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Assinar Agora
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Assinatura</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPlanId && (
                <>
                  Você está prestes a assinar o plano{" "}
                  <strong>
                    {plans.find((p) => p.id === selectedPlanId)?.name}
                  </strong>
                  {plans.find((p) => p.id === selectedPlanId)?.priceCents !== 0 && (
                    <>
                      {" "}
                      por{" "}
                      <strong>
                        {formatPrice(
                          plans.find((p) => p.id === selectedPlanId)?.priceCents || 0
                        )}
                        /mês
                      </strong>
                    </>
                  )}
                  . {currentSubscription && "Seu plano atual será cancelado e substituído."}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purchasing !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPurchase}
              disabled={purchasing !== null}
            >
              {purchasing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlanPurchase;
