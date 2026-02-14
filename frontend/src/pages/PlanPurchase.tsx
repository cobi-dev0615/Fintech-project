import { useState, useEffect } from "react";
import {
  Check,
  CreditCard,
  Loader2,
  CheckCircle2,
  Calendar,
  Package,
  Crown,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  subscriberCount: number;
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

// Minimum display counts per plan index (0, 1, 2, ...)
const MIN_USER_COUNTS = [50, 70, 80];

// Simulated user avatars with colorful gradients and initials
const AVATAR_SETS = [
  [
    { initials: "MR", from: "from-violet-500", to: "to-purple-600" },
    { initials: "AL", from: "from-rose-500", to: "to-pink-600" },
    { initials: "JS", from: "from-amber-500", to: "to-orange-600" },
    { initials: "KT", from: "from-cyan-500", to: "to-blue-600" },
  ],
  [
    { initials: "RP", from: "from-emerald-500", to: "to-teal-600" },
    { initials: "FS", from: "from-blue-500", to: "to-indigo-600" },
    { initials: "LM", from: "from-pink-500", to: "to-rose-600" },
    { initials: "DC", from: "from-orange-500", to: "to-red-600" },
  ],
  [
    { initials: "TC", from: "from-indigo-500", to: "to-violet-600" },
    { initials: "NA", from: "from-teal-500", to: "to-emerald-600" },
    { initials: "GH", from: "from-fuchsia-500", to: "to-purple-600" },
    { initials: "WB", from: "from-sky-500", to: "to-blue-600" },
  ],
];

const PlanPurchase = () => {
  const { t, i18n } = useTranslation(["plans", "common"]);
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<CurrentSubscription | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly"
  );
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Get date-fns locale based on current language
  const dateLocale =
    i18n.language === "pt-BR" || i18n.language === "pt" ? ptBR : enUS;

  // Initial data fetch (subscription)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setInitialLoading(true);
        const subscriptionResponse = await subscriptionsApi
          .getMySubscription()
          .catch(() => ({ subscription: null }));

        if (subscriptionResponse.subscription) {
          setCurrentSubscription({
            id: subscriptionResponse.subscription.id,
            status: subscriptionResponse.subscription.status,
            currentPeriodEnd:
              subscriptionResponse.subscription.currentPeriodEnd,
            plan: subscriptionResponse.subscription.plan,
          });
        }
      } catch (error: any) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Plan codes by audience
  const CONSULTANT_PLAN_CODES = ["consultant", "enterprise"];

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const plansResponse = await publicApi.getPlans(billingPeriod);
      const allPlans = plansResponse.plans || [];
      const role = user?.role;
      const filtered =
        role === "consultant"
          ? allPlans.filter((p) =>
              CONSULTANT_PLAN_CODES.includes((p.code || "").toLowerCase())
            )
          : allPlans.filter(
              (p) =>
                !CONSULTANT_PLAN_CODES.includes((p.code || "").toLowerCase())
            );
      setPlans(filtered);
    } catch (error: any) {
      console.error("Failed to fetch plans:", error);
      toast({
        title: t("common:error"),
        description: error?.error || t("loadError"),
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
    if (
      currentSubscription?.plan.id === planId &&
      currentSubscription.status === "active"
    ) {
      toast({
        title: t("alreadyActive"),
        description: t("alreadyActiveDesc"),
        variant: "default",
      });
      return;
    }

    setSelectedPlanId(planId);
    setShowConfirmDialog(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPlanId) return;

    setShowConfirmDialog(false);
    const planId = selectedPlanId;
    setSelectedPlanId(null);

    if (location.pathname.startsWith("/consultant")) {
      navigate("/consultant/payment", { state: { planId, billingPeriod } });
    } else {
      navigate("/app/payment", { state: { planId, billingPeriod } });
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return t("common:free");
    const reais = cents / 100;
    return formatCurrency(reais);
  };

  const getSubtitle = (code: string) => {
    const key = code.toLowerCase();
    return t(`subtitles.${key}`, { defaultValue: "" });
  };

  const isCurrentPlan = (planId: string) => {
    return (
      currentSubscription?.plan.id === planId &&
      currentSubscription.status === "active"
    );
  };

  const isFeatured = (code: string) => {
    if (user?.role === "consultant") return code.toLowerCase() === "consultant";
    return code === "pro";
  };

  const getPlanBadge = (code: string) => {
    const lower = code.toLowerCase();
    if (lower === "enterprise") return t("subtitles.enterprise");
    return null;
  };

  const isConsultantPlans = user?.role === "consultant";

  if (initialLoading) {
    return (
      <div className="space-y-6 min-w-0">
        {/* Skeleton billing toggle */}
        <div className="flex justify-center">
          <Skeleton className="h-10 w-[200px] rounded-lg" />
        </div>
        {/* Skeleton plan cards */}
        <div
          className={cn(
            "grid gap-5",
            isConsultantPlans
              ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {Array.from({ length: isConsultantPlans ? 2 : 3 }).map((_, i) => (
            <div key={i} className="chart-card space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-3 w-40" />
              <div className="space-y-2 pt-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="h-11 w-full mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Billing Period Toggle */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">{t("billing")}</span>
        <Tabs
          value={billingPeriod}
          onValueChange={(value) =>
            setBillingPeriod(value as "monthly" | "annual")
          }
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-2 sm:inline-grid sm:w-auto sm:min-w-[220px] h-10 p-1 rounded-xl bg-muted/80 border border-border">
            <TabsTrigger
              value="monthly"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              {t("monthly")}
            </TabsTrigger>
            <TabsTrigger
              value="annual"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              {t("annual")}
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
          <div className="chart-card flex flex-col items-center justify-center text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-foreground">
              {t("noPlans")}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {t("noPlansDesc")}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-5",
              plans.length <= 2
                ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              plansLoading && "opacity-50 pointer-events-none"
            )}
          >
            {plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan.id);
              const featured = isFeatured(plan.code);
              const isFree = plan.priceCents === 0;
              const currentPrice =
                billingPeriod === "annual"
                  ? plan.annualPriceCents
                  : plan.monthlyPriceCents;
              const monthlyEquivalent =
                billingPeriod === "annual"
                  ? Math.round(plan.annualPriceCents / 12)
                  : plan.monthlyPriceCents;
              const savings =
                billingPeriod === "annual" && plan.annualPriceCents > 0
                  ? Math.round(
                      ((plan.monthlyPriceCents * 12 - plan.annualPriceCents) /
                        (plan.monthlyPriceCents * 12)) *
                        100
                    )
                  : 0;
              const planBadge = getPlanBadge(plan.code);
              const planIndex = plans.indexOf(plan);
              const minCount = MIN_USER_COUNTS[planIndex] ?? 80;
              const userCount = Math.max(plan.subscriberCount, minCount);

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "chart-card relative flex flex-col transition-all duration-300 overflow-visible",
                    featured &&
                      "ring-2 ring-primary/60 shadow-lg shadow-primary/10",
                    isCurrent && "ring-2 ring-emerald-500/60"
                  )}
                >
                  {/* Badges */}
                  {featured && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-primary text-primary-foreground shadow-md px-3 py-1 text-xs font-semibold whitespace-nowrap">
                        <Crown className="h-3 w-3 mr-1" />
                        {t("mostPopular")}
                      </Badge>
                    </div>
                  )}

                  {planBadge && !featured && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge
                        variant="secondary"
                        className="shadow-md px-3 py-1 text-xs font-semibold whitespace-nowrap"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {planBadge}
                      </Badge>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-emerald-600 text-white shadow-md px-3 py-1 text-xs font-semibold whitespace-nowrap">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t("currentPlan")}
                      </Badge>
                    </div>
                  )}

                  {billingPeriod === "annual" && savings > 0 && (
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant="secondary"
                        className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-xs"
                      >
                        -{savings}%
                      </Badge>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="pt-2 pb-4">
                    <h3 className="text-lg font-bold text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getSubtitle(plan.code)}
                    </p>
                  </div>

                  {/* Price Section */}
                  <div className="pb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground tracking-tight">
                        {formatPrice(currentPrice)}
                      </span>
                      {!isFree && (
                        <span className="text-sm text-muted-foreground">
                          /{t(billingPeriod === "annual" ? "perYear" : "perMonth")}
                        </span>
                      )}
                    </div>
                    {billingPeriod === "annual" && !isFree && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatPrice(monthlyEquivalent)}
                        {t("perMonthShort")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {isFree
                        ? t("subtitles.free")
                        : t(
                            billingPeriod === "annual"
                              ? "billedAnnually"
                              : "billedMonthly"
                          )}
                    </p>

                    {/* Current plan renewal info */}
                    {isCurrent && currentSubscription?.currentPeriodEnd && (
                      <div className="flex items-center gap-1 mt-2">
                        <Calendar className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          {t("planUntil")}{" "}
                          <strong>
                            {format(
                              parseISO(currentSubscription.currentPeriodEnd),
                              "dd/MM/yyyy",
                              { locale: dateLocale }
                            )}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User avatars */}
                  <div className="flex items-center gap-2 py-3">
                    <div className="flex -space-x-2">
                      {(AVATAR_SETS[planIndex % AVATAR_SETS.length]).map((av, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-7 w-7 rounded-full border-2 border-background flex items-center justify-center bg-gradient-to-br",
                            av.from,
                            av.to
                          )}
                        >
                          <span className="text-[9px] font-bold text-white leading-none">
                            {av.initials}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t("usedByUsers", { count: userCount })}
                    </span>
                  </div>

                  {/* Connections */}
                  <p className="text-xs font-medium text-muted-foreground pb-3">
                    {plan.connectionLimit !== null
                      ? t("connections", { count: plan.connectionLimit })
                      : t("connectionsUnlimited")}
                  </p>

                  {/* Features */}
                  <ul className="space-y-2.5 flex-1 pb-5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm text-foreground/80">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handlePurchaseClick(plan.id)}
                    disabled={isCurrent || purchasing !== null}
                    variant={featured ? "default" : "outline"}
                    className={cn(
                      "w-full mt-auto h-11",
                      featured &&
                        "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md",
                      isCurrent &&
                        "bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/30"
                    )}
                    size="default"
                  >
                    {purchasing === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("processing")}
                      </>
                    ) : isCurrent ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t("activePlan")}
                      </>
                    ) : isFree ? (
                      t("startFree")
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        {t("getStarted")}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="gap-6 p-6 sm:p-7">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle>{t("confirmDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {selectedPlanId && (
                <>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: t("confirmDialog.description", {
                        name:
                          plans.find((p) => p.id === selectedPlanId)?.name || "",
                        price: formatPrice(
                          billingPeriod === "annual"
                            ? plans.find((p) => p.id === selectedPlanId)
                                ?.annualPriceCents || 0
                            : plans.find((p) => p.id === selectedPlanId)
                                ?.monthlyPriceCents || 0
                        ),
                        period: t(
                          billingPeriod === "annual" ? "perYear" : "perMonth"
                        ),
                      }),
                    }}
                  />
                  {currentSubscription && ` ${t("currentPlanReplaced")}`}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-1 gap-2 sm:gap-3">
            <AlertDialogCancel disabled={purchasing !== null}>
              {t("common:cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPurchase}
              disabled={purchasing !== null}
            >
              {purchasing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("processing")}
                </>
              ) : (
                t("common:confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlanPurchase;
