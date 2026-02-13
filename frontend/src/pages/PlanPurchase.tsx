import { useState, useEffect } from "react";
import { Check, CreditCard, Loader2, CheckCircle2, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { publicApi, subscriptionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
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
  const { t, i18n } = useTranslation(['plans', 'common']);
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
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

  // Get date-fns locale based on current language
  const dateLocale = i18n.language === 'pt-BR' || i18n.language === 'pt' ? ptBR : enUS;

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

  // Plan codes by audience: consultants see 299/499 only; customers see the rest
  const CONSULTANT_PLAN_CODES = ['consultant', 'enterprise'];

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const plansResponse = await publicApi.getPlans(billingPeriod);
      const allPlans = plansResponse.plans || [];
      const role = user?.role;
      const filtered =
        role === 'consultant'
          ? allPlans.filter((p) => CONSULTANT_PLAN_CODES.includes((p.code || '').toLowerCase()))
          : allPlans.filter((p) => !CONSULTANT_PLAN_CODES.includes((p.code || '').toLowerCase()));
      setPlans(filtered);
    } catch (error: any) {
      console.error('Failed to fetch plans:', error);
      toast({
        title: t('common:error'),
        description: error?.error || t('loadError'),
        variant: "destructive",
      });
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [billingPeriod, user?.role]);

  const handlePurchaseClick = (planId: string) => {
    // Don't allow purchasing the same plan
    if (currentSubscription?.plan.id === planId && currentSubscription.status === 'active') {
      toast({
        title: t('alreadyActive'),
        description: t('alreadyActiveDesc'),
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
    if (cents === 0) return t('common:free');
    const reais = cents / 100;
    return formatCurrency(reais);
  };

  const getPlanCardColor = (code: string) => {
    switch (code.toLowerCase()) {
      case 'free':
        return {
          border: 'border-2 border-gray-500/50',
          hover: 'hover:border-gray-500/70 hover:shadow-md hover:shadow-gray-500/10',
          featured: 'border-2 border-gray-500 shadow-md shadow-gray-500/10',
          badge: 'bg-gray-500 text-gray-50',
          ring: 'ring-gray-500',
        };
      case 'basic':
        return {
          border: 'border-2 border-blue-500/70',
          hover: 'hover:border-blue-500/80 hover:shadow-md hover:shadow-blue-500/10',
          featured: 'border-2 border-blue-500 shadow-md shadow-blue-500/10',
          badge: 'bg-blue-500 text-blue-50',
          ring: 'ring-blue-500',
        };
      case 'pro':
        return {
          border: 'border-2 border-emerald-500/70',
          hover: 'hover:border-emerald-500/80 hover:shadow-md hover:shadow-emerald-500/10',
          featured: 'border-2 border-emerald-500 shadow-md shadow-emerald-500/10',
          badge: 'bg-emerald-500 text-emerald-50',
          ring: 'ring-emerald-500',
        };
      case 'consultant':
        return {
          border: 'border-2 border-violet-500/70',
          hover: 'hover:border-violet-500/80 hover:shadow-md hover:shadow-violet-500/10',
          featured: 'border-2 border-violet-500/70 shadow-md shadow-violet-500/10',
          badge: 'bg-violet-500 text-violet-50',
          ring: 'ring-violet-500',
        };
      case 'enterprise':
        return {
          border: 'border-2 border-amber-500/70',
          hover: 'hover:border-amber-500/80 hover:shadow-md hover:shadow-amber-500/10',
          featured: 'border-2 border-amber-500 shadow-md shadow-amber-500/10',
          badge: 'bg-amber-500 text-amber-50',
          ring: 'ring-amber-500',
        };
      default:
        return {
          border: 'border-2 border-primary/70',
          hover: 'hover:border-primary/80 hover:shadow-md hover:shadow-primary/10',
          featured: 'border-2 border-primary shadow-md shadow-primary/10',
          badge: 'bg-primary text-primary-foreground',
          ring: 'ring-primary',
        };
    }
  };

  const getSubtitle = (code: string) => {
    const key = code.toLowerCase();
    return t(`subtitles.${key}`, { defaultValue: '' });
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan.id === planId && currentSubscription.status === 'active';
  };

  const isFeatured = (code: string) => {
    if (user?.role === 'consultant') return code.toLowerCase() === 'consultant';
    return code === 'pro';
  };

  const isConsultantPlans = user?.role === 'consultant';

  if (initialLoading) {
    const skeletonCount = isConsultantPlans ? 2 : 3;
    return (
      <div className="space-y-6 min-w-0">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex justify-center">
          <Skeleton className="h-10 w-[200px] rounded-lg" />
        </div>
        <div className={cn("grid gap-5", isConsultantPlans ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Card key={i} className="border-2 border-border overflow-hidden">
              <CardHeader className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
                <Skeleton className="h-10 w-full mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Billing Period Toggle */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">{t('billing')}</span>
        <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'annual')} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-2 sm:inline-grid sm:w-auto sm:min-w-[220px] h-10 p-1 rounded-xl bg-muted/80 border border-border">
            <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              {t('monthly')}
            </TabsTrigger>
            <TabsTrigger value="annual" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              {t('annual')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Plans Grid */}
      <div className="relative min-h-[200px]">
        {plansLoading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl min-h-[280px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!plansLoading && plans.length === 0 ? (
          <div className="rounded-xl border-2 border-blue-500/70 bg-card p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-foreground">{t('noPlans')}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {t('noPlansDesc')}
            </p>
          </div>
        ) : (
        <div className={cn(
          "grid gap-5",
          plans.length <= 2 ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          plansLoading && "opacity-50 pointer-events-none"
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
                  "relative flex flex-col transition-all duration-300 border-2 min-w-0 overflow-visible",
                  featured && colors.featured,
                  !featured && colors.border + " " + colors.hover,
                  isCurrent && `ring-2 ${colors.ring}`
                )}
              >
                {featured && (
                  <div className={cn(
                    "absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow-sm",
                    colors.badge
                  )}>
                    {t('mostPopular')}
                  </div>
                )}

                {billingPeriod === 'annual' && savings > 0 && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                      -{savings}%
                    </Badge>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="default" className={colors.badge}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('currentPlan')}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2 pt-5">
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
                          {t('planUntil')}{" "}
                          <strong className="text-foreground">
                            {format(parseISO(currentSubscription.currentPeriodEnd), "dd/MM/yyyy", { locale: dateLocale })}
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
                          /{t(billingPeriod === 'annual' ? 'perYear' : 'perMonth')}
                        </span>
                      )}
                    </div>
                    {billingPeriod === 'annual' && !isFree && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatPrice(monthlyEquivalent)}{t('perMonthShort')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.connectionLimit !== null
                        ? t('connections', { count: plan.connectionLimit })
                        : t('connectionsUnlimited')
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
                      "w-full mt-auto",
                      featured && "bg-green-600 hover:bg-green-700 text-white border-0"
                    )}
                    size="default"
                  >
                    {purchasing === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('processing')}
                      </>
                    ) : isCurrent ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t('activePlan')}
                      </>
                    ) : isFree ? (
                      t('startFree')
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        {t('subscribe')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="gap-6 p-6 sm:p-7">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle>{t('confirmDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {selectedPlanId && (
                <>
                  <span dangerouslySetInnerHTML={{
                    __html: t('confirmDialog.description', {
                      name: plans.find((p) => p.id === selectedPlanId)?.name || '',
                      price: formatPrice(
                        billingPeriod === 'annual'
                          ? plans.find((p) => p.id === selectedPlanId)?.annualPriceCents || 0
                          : plans.find((p) => p.id === selectedPlanId)?.monthlyPriceCents || 0
                      ),
                      period: t(billingPeriod === 'annual' ? 'perYear' : 'perMonth')
                    })
                  }} />
                  {currentSubscription && ` ${t('currentPlanReplaced')}`}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-1 gap-2 sm:gap-3">
            <AlertDialogCancel disabled={purchasing !== null}>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPurchase}
              disabled={purchasing !== null}
            >
              {purchasing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('processing')}
                </>
              ) : (
                t('common:confirm')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlanPurchase;
