import { useState, useEffect } from "react";
import { Check, CreditCard, Loader2, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { publicApi, subscriptionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  monthlyPriceCents: number;
  annualPriceCents: number;
  priceCents: number;
  connectionLimit: number | null;
  features: string[];
  isActive: boolean;
  role: string | null;
}

interface CurrentSubscription {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  plan: {
    id: string;
    code: string;
    name: string;
  };
}

const PlanPurchase = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine user role - default to customer if not available
  const userRole = user?.role || (location.pathname.startsWith('/consultant') ? 'consultant' : 'customer');

  // Initial data fetch (subscription + plans)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setInitialLoading(true);
        const subscriptionResponse = await subscriptionsApi.getMySubscription().catch(() => ({ subscription: null }));
        
        if (subscriptionResponse.subscription) {
          setCurrentSubscription({
            id: subscriptionResponse.subscription.id,
            status: subscriptionResponse.subscription.status,
            currentPeriodEnd: subscriptionResponse.subscription.currentPeriodEnd,
            plan: subscriptionResponse.subscription.plan,
          });
        }
      } catch (error: any) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch plans when billing period or role changes
  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const plansResponse = await publicApi.getPlans(userRole as 'customer' | 'consultant', billingPeriod);
      setPlans(plansResponse.plans);
    } catch (error: any) {
      console.error('Failed to fetch plans:', error);
      toast({
        title: "Erro",
        description: error?.error || 'Falha ao carregar planos',
        variant: "destructive",
      });
    } finally {
      setPlansLoading(false);
    }
  };

  // Fetch plans on mount and when billing period changes
  useEffect(() => {
    fetchPlans();
  }, [billingPeriod, userRole]);

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

    // Redirect to payment page with plan ID and billing period
    setShowConfirmDialog(false);
    const planId = selectedPlanId;
    setSelectedPlanId(null);

    if (location.pathname.startsWith('/consultant')) {
      navigate('/consultant/payment', { state: { planId, billingPeriod } });
    } else {
      navigate('/app/payment', { state: { planId, billingPeriod } });
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Grátis';
    const reais = cents / 100;
    return `R$ ${reais.toFixed(2).replace('.', ',')}`;
  };

  const getPlanCardColor = (plan: Plan) => {
    // Different colors for customer vs consultant plans
    if (userRole === 'consultant') {
      // Consultant plans - use teal/cyan colors
      return {
        border: 'border-teal-500/30',
        hover: 'hover:border-teal-500/50',
        featured: 'border-teal-500 shadow-lg shadow-teal-500/10',
        badge: 'bg-teal-500 text-teal-50',
        ring: 'ring-teal-500',
      };
    } else {
      // Customer plans - use blue colors (default)
      return {
        border: 'border-primary/30',
        hover: 'hover:border-primary/50',
        featured: 'border-primary shadow-lg shadow-primary/10',
        badge: 'bg-primary text-primary-foreground',
        ring: 'ring-primary',
      };
    }
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

  if (initialLoading) {
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
        <Card className={cn(
          "mb-6 border-primary/20 bg-primary/5",
          userRole === 'consultant' && "border-teal-500/20 bg-teal-500/5"
        )}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className={cn(
                    "h-5 w-5 text-primary",
                    userRole === 'consultant' && "text-teal-500"
                  )} />
                  Plano Atual
                </CardTitle>
                <CardDescription className="text-base">
                  Você está atualmente no plano <strong className="text-foreground">{currentSubscription.plan.name}</strong>
                </CardDescription>
                {currentSubscription.currentPeriodEnd && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Válido até:{" "}
                      <strong className="text-foreground">
                        {format(parseISO(currentSubscription.currentPeriodEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
              <Badge variant="default" className={cn(
                "bg-primary",
                userRole === 'consultant' && "bg-teal-500"
              )}>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Billing Period Toggle */}
      <div className="mb-6 flex justify-center">
        <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'annual')}>
          <TabsList>
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="annual">Anual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Plans Grid */}
      <div className="relative">
        {plansLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
          plansLoading && "opacity-50"
        )}>
          {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.id);
          const featured = isFeatured(plan.code);
          const isFree = plan.priceCents === 0;
          const colors = getPlanCardColor(plan);
          const currentPrice = billingPeriod === 'annual' ? plan.annualPriceCents : plan.monthlyPriceCents;
          const monthlyEquivalent = billingPeriod === 'annual' ? Math.round(plan.annualPriceCents / 12) : plan.monthlyPriceCents;
          const savings = billingPeriod === 'annual' && plan.annualPriceCents > 0 
            ? Math.round(((plan.monthlyPriceCents * 12 - plan.annualPriceCents) / (plan.monthlyPriceCents * 12)) * 100)
            : 0;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col transition-all duration-300",
                featured && colors.featured + " scale-105",
                !featured && colors.hover,
                isCurrent && `ring-2 ${colors.ring}`
              )}
            >
              {featured && (
                <div className={cn(
                  "absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap",
                  colors.badge
                )}>
                  Mais Popular
                </div>
              )}

              {billingPeriod === 'annual' && savings > 0 && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    Economize {savings}%
                  </Badge>
                </div>
              )}

              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <Badge variant="default" className={cn(
                    "bg-primary",
                    userRole === 'consultant' && "bg-teal-500"
                  )}>
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
                      {formatPrice(currentPrice)}
                    </span>
                    {!isFree && (
                      <span className="text-sm text-muted-foreground">
                        /{billingPeriod === 'annual' ? 'ano' : 'mês'}
                      </span>
                    )}
                  </div>
                  {billingPeriod === 'annual' && !isFree && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPrice(monthlyEquivalent)}/mês equivalente
                    </p>
                  )}
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
                  className={cn(
                    "w-full",
                    userRole === 'consultant' && featured && "bg-teal-500 hover:bg-teal-600"
                  )}
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
                        /{billingPeriod === 'annual' ? 'ano' : 'mês'}
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
