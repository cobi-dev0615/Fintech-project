import { Check, Crown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { publicApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface Plan {
  name: string;
  code: string;
  subtitle: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  featured: boolean;
  connectionLimit: number | null;
  subscriberCount: number;
}

// Minimum display counts per plan index
const MIN_USER_COUNTS = [50, 70, 80];

// Simulated user avatars
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

const PricingSection = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['landing', 'plans']);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await publicApi.getPlans();

        const displayCodes = ['basic', 'pro', 'consultant'];
        const mappedPlans: Plan[] = response.plans
          .filter(plan => plan.isActive && displayCodes.includes((plan.code || '').toLowerCase()))
          .map((plan) => {
            const getSubtitle = (code: string, name: string) => {
              if (code === 'free') return t('pricing.subtitleFree');
              if (code === 'basic') return t('pricing.subtitleBasic');
              if (code === 'pro' || code === 'professional') return t('pricing.subtitlePro');
              return name;
            };

            const getCta = (code: string, name: string) => {
              if (code === 'free') return t('pricing.ctaFree');
              if (code === 'basic') return t('pricing.ctaBasic');
              if (code === 'pro' || code === 'professional') return t('pricing.ctaPro');
              return t('pricing.ctaDefault', { name });
            };

            const formatPrice = (cents: number) => {
              if (cents === 0) return 'R$ 0';
              const reais = cents / 100;
              return `R$ ${reais.toFixed(2).replace('.', ',')}`;
            };

            const period = plan.priceCents === 0 ? t('pricing.periodForever') : t('pricing.periodMonth');
            const featured = plan.code === 'pro' || plan.code === 'professional';

            return {
              name: plan.name,
              code: plan.code,
              subtitle: getSubtitle(plan.code, plan.name),
              price: formatPrice(plan.priceCents),
              period,
              features: plan.features || [],
              cta: getCta(plan.code, plan.name),
              featured,
              connectionLimit: plan.connectionLimit,
              subscriberCount: plan.subscriberCount,
            };
          })
          .sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return 0;
          });

        setPlans(mappedPlans);
      } catch (err: any) {
        console.error('Failed to fetch plans:', err);
        setError(t('pricing.errorLoading'));
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return (
    <section id="tools" className="py-20 bg-background scroll-mt-20">
      <div className="container mx-auto px-6 sm:px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('pricing.heading')}{" "}
            <span className="text-primary">{t('pricing.headingHighlight')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('pricing.description')}
          </p>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-muted-foreground">{t('pricing.loadingPlans')}</div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-destructive">{error}</div>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50 mr-3" />
            <div className="text-muted-foreground">{t('pricing.noPlans')}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => {
              const minCount = MIN_USER_COUNTS[index] ?? 80;
              const userCount = Math.max(plan.subscriberCount, minCount);
              const avatars = AVATAR_SETS[index % AVATAR_SETS.length];

              return (
                <div
                  key={plan.name}
                  className={cn(
                    "chart-card relative flex flex-col transition-all duration-300 overflow-visible hover:scale-[1.02]",
                    plan.featured &&
                      "ring-2 ring-primary/60 shadow-lg shadow-primary/10"
                  )}
                >
                  {/* Featured Badge */}
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-primary text-primary-foreground shadow-md px-3 py-1 text-xs font-semibold whitespace-nowrap">
                        <Crown className="h-3 w-3 mr-1" />
                        {t('pricing.mostPopular')}
                      </Badge>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="pt-2 pb-4">
                    <h3 className="text-lg font-bold text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.subtitle}
                    </p>
                  </div>

                  {/* Price Section */}
                  <div className="pb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground tracking-tight">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-sm text-muted-foreground">
                          {plan.period}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* User Avatars */}
                  <div className="flex items-center gap-2 py-3">
                    <div className="flex -space-x-2">
                      {avatars.map((av, i) => (
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
                      {t('plans:usedByUsers', { count: userCount })}
                    </span>
                  </div>

                  {/* Connections */}
                  <p className="text-xs font-medium text-muted-foreground pb-3">
                    {plan.connectionLimit !== null
                      ? t('plans:connections', { count: plan.connectionLimit })
                      : t('plans:connectionsUnlimited')}
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

                  {/* CTA */}
                  <Button
                    onClick={() => {
                      if (user) {
                        if (user.role === 'consultant') {
                          navigate('/consultant/plans');
                        } else {
                          navigate('/app/plans');
                        }
                      } else {
                        navigate('/login');
                      }
                    }}
                    variant={plan.featured ? "default" : "outline"}
                    className={cn(
                      "w-full mt-auto h-11",
                      plan.featured &&
                        "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                    )}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;
