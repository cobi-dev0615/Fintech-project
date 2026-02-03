import { useState, useEffect } from "react";
import { Check, CreditCard, Loader2, CheckCircle2, Calendar } from "lucide-react";
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

  // Initial data fetch (subscription)
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

  // Fetch plans when billing period changes
  const DISPLAY_PLAN_CODES = ['basic', 'pro', 'consultant'];

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const plansResponse = await publicApi.getPlans(billingPeriod);
      const filtered = (plansResponse.plans || []).filter((p) =>
        DISPLAY_PLAN_CODES.includes((p.code || '').toLowerCase())
      );
      setPlans(filtered);
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

  useEffect(() => {
    fetchPlans();
  }, [billingPeriod]);

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

  const getPlanCardColor = (code: string) => {
    switch (code.toLowerCase()) {
      case 'free':
        return {
          border: 'border-gray-500/30',
          hover: 'hover:border-gray-500/50',
          featured: 'border-gray-500 shadow-lg shadow-gray-500/10',
          badge: 'bg-gray-500 text-gray-50',
          ring: 'ring-gray-500',
        };
      case 'basic':
        return {
          border: 'border-blue-500/30',
          hover: 'hover:border-blue-500/50',
          featured: 'border-blue-500 shadow-lg shadow-blue-500/10',
          badge: 'bg-blue-500 text-blue-50',
          ring: 'ring-blue-500',
        };
      case 'pro':
        return {
          border: 'border-green-500/30',
          hover: 'hover:border-green-500/50',
          featured: 'border-green-500 shadow-lg shadow-green-500/10',
          badge: 'bg-green-500 text-green-50',
          ring: 'ring-green-500',
        };
      case 'consultant':
        return {
          border: 'border-purple-500/30',
          hover: 'hover:border-purple-500/50',
          featured: 'border-purple-500 shadow-lg shadow-purple-500/10',
          badge: 'bg-purple-500 text-purple-50',
          ring: 'ring-purple-500',
        };
      case 'enterprise':
        return {
          border: 'border-yellow-500/30',
          hover: 'hover:border-yellow-500/50',
          featured: 'border-yellow-500 shadow-lg shadow-yellow-500/10',
          badge: 'bg-yellow-500 text-yellow-50',
          ring: 'ring-yellow-500',
        };
      default:
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
    switch (code.toLowerCase()) {
      case 'free': return 'Ideal para começar';
      case 'basic': return 'Para quem quer mais';
      case 'pro': return 'Controle total';
      case 'consultant': return 'Para profissionais';
      case 'enterprise': return 'Solução completa';
      default: return '';
    }
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan.id === planId && currentSubscription.status === 'active';
  };

  const isFeatured = (code: string) => {
    return code === 'pro';
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Escolha seu Plano</h1>
        <p className="text-muted-foreground">
          Selecione o plano que melhor se adapta às suas necessidades. Você pode alterar a qualquer momento.
        </p>
      </div>

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
          "grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto",
          plansLoading && "opacity-50"
        )}>
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.id);
            const featured = isFeatured(plan.code);
            const isFree = plan.priceCents === 0;
            const colors = getPlanCardColor(plan.code);
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
                  featured && colors.featured + " scale-[1.02]",
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
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
                      -{savings}%
                    </Badge>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="default" className={colors.badge}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Atual
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {isCurrent && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isCurrent && currentSubscription?.currentPeriodEnd ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Até{" "}
                          <strong className="text-foreground">
                            {format(parseISO(currentSubscription.currentPeriodEnd), "dd/MM/yyyy", { locale: ptBR })}
                          </strong>
                        </span>
                      </div>
                    ) : (
                      getSubtitle(plan.code)
                    )}
                  </CardDescription>
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        {formatPrice(currentPrice)}
                      </span>
                      {!isFree && (
                        <span className="text-xs text-muted-foreground">
                          /{billingPeriod === 'annual' ? 'ano' : 'mês'}
                        </span>
                      )}
                    </div>
                    {billingPeriod === 'annual' && !isFree && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatPrice(monthlyEquivalent)}/mês
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.connectionLimit !== null 
                        ? `${plan.connectionLimit} conexão${plan.connectionLimit > 1 ? 'ões' : ''}`
                        : 'Conexões ilimitadas'
                      }
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col pt-2">
                  <ul className="space-y-2 mb-4 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handlePurchaseClick(plan.id)}
                    disabled={isCurrent || purchasing !== null}
                    variant={featured ? "default" : "outline"}
                    className={cn(
                      "w-full",
                      featured && "bg-green-500 hover:bg-green-600"
                    )}
                    size="sm"
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
                        Assinar
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
                          billingPeriod === 'annual'
                            ? plans.find((p) => p.id === selectedPlanId)?.annualPriceCents || 0
                            : plans.find((p) => p.id === selectedPlanId)?.monthlyPriceCents || 0
                        )}
                        /{billingPeriod === 'annual' ? 'ano' : 'mês'}
                      </strong>
                    </>
                  )}
                  . {currentSubscription && "Seu plano atual será substituído."}
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
