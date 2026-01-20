import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { publicApi } from "@/lib/api";
import { useState, useEffect } from "react";

interface Plan {
  name: string;
  subtitle: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  featured: boolean;
}

const PricingSection = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await publicApi.getPlans();
        
        // Map backend plans to frontend format
        const mappedPlans: Plan[] = response.plans
          .filter(plan => plan.isActive) // Only show active plans
          .map((plan) => {
            // Determine subtitle and CTA based on plan code
            const getSubtitle = (code: string, name: string) => {
              if (code === 'free') return 'Ideal para começar';
              if (code === 'basic') return 'Para quem quer mais';
              if (code === 'pro' || code === 'professional') return 'Controle total';
              return name;
            };

            const getCta = (code: string, name: string) => {
              if (code === 'free') return 'Começar Grátis';
              if (code === 'basic') return 'Assinar Básico';
              if (code === 'pro' || code === 'professional') return 'Assinar Pro';
              return `Assinar ${name}`;
            };

            // Format price
            const formatPrice = (cents: number) => {
              if (cents === 0) return 'R$ 0';
              const reais = cents / 100;
              return `R$ ${reais.toFixed(2).replace('.', ',')}`;
            };

            // Determine period
            const period = plan.priceCents === 0 ? 'para sempre' : '/mês';

            // Determine if featured (pro/professional is usually featured)
            const featured = plan.code === 'pro' || plan.code === 'professional';

            return {
              name: plan.name,
              subtitle: getSubtitle(plan.code, plan.name),
              price: formatPrice(plan.priceCents),
              period,
              features: plan.features || [],
              cta: getCta(plan.code, plan.name),
              featured,
            };
          })
          .sort((a, b) => {
            // Sort by featured first, then by price
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return 0;
          });

        setPlans(mappedPlans);
      } catch (err: any) {
        console.error('Failed to fetch plans:', err);
        setError('Erro ao carregar planos');
        // Fallback to empty array or default plans if needed
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Planos para{" "}
            <span className="text-primary">todos os bolsos</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece grátis e faça upgrade quando precisar de mais recursos.
          </p>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-muted-foreground">Carregando planos...</div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-destructive">{error}</div>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-muted-foreground">Nenhum plano disponível no momento.</div>
          </div>
        ) : (
          <div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
            style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
          >
            {plans.map((plan, index) => {
            // Different 3D rotations for each card
            const rotations = [
              { rotateX: '1deg', rotateY: '-2deg' }, // Left card
              { rotateX: '0deg', rotateY: '0deg' },  // Middle card (featured) - center
              { rotateX: '1deg', rotateY: '2deg' },  // Right card
            ];
            const hoverRotations = [
              { rotateX: '3deg', rotateY: '-4deg', translateZ: '25px' }, // Left card
              { rotateX: '0deg', rotateY: '0deg', translateZ: '30px' },  // Middle card (featured) - more lift
              { rotateX: '3deg', rotateY: '4deg', translateZ: '25px' },  // Right card
            ];
            const rotation = rotations[index % rotations.length];
            const hoverRotation = hoverRotations[index % hoverRotations.length];
            
            // Different gradient colors for each card
            const gradientShadows = [
              'from-primary/20 via-accent/10 to-transparent', // Left card
              'from-primary/30 via-primary/15 to-transparent', // Middle card (featured)
              'from-accent/20 via-primary/10 to-transparent', // Right card
            ];
            const gradientShadow = gradientShadows[index % gradientShadows.length];
            
            return (
            <div
              key={plan.name}
              className={cn(
                "bg-card border rounded-lg p-6 flex flex-col relative transition-all duration-300",
                plan.featured
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border hover:border-primary/30"
              )}
              style={{
                transform: `perspective(1200px) rotateX(${rotation.rotateX}) rotateY(${rotation.rotateY}) translateZ(0)`,
                transformStyle: 'preserve-3d',
                willChange: 'transform',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.transform = `perspective(1200px) rotateX(${hoverRotation.rotateX}) rotateY(${hoverRotation.rotateY}) translateZ(${hoverRotation.translateZ}) scale(${plan.featured ? '1.05' : '1.03'})`;
                target.style.boxShadow = plan.featured 
                  ? '0 25px 50px rgba(0, 0, 0, 0.4), 0 0 40px rgba(var(--primary), 0.2)'
                  : '0 20px 40px rgba(0, 0, 0, 0.3)';
                // Enhance gradient shadow on hover
                const shadowElement = target.querySelector('.gradient-shadow') as HTMLElement;
                if (shadowElement) {
                  shadowElement.style.opacity = '0.8';
                  shadowElement.style.transform = 'scale(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.transform = `perspective(1200px) rotateX(${rotation.rotateX}) rotateY(${rotation.rotateY}) translateZ(0)`;
                target.style.boxShadow = '';
                // Reset gradient shadow
                const shadowElement = target.querySelector('.gradient-shadow') as HTMLElement;
                if (shadowElement) {
                  shadowElement.style.opacity = '0.5';
                  shadowElement.style.transform = 'scale(1)';
                }
              }}
            >
              {/* Gradient Shadow Behind Card */}
              <div 
                className={`gradient-shadow absolute inset-0 bg-gradient-to-br ${gradientShadow} rounded-lg blur-2xl -z-10 transition-all duration-300`}
                style={{
                  top: '10%',
                  left: '10%',
                  right: '10%',
                  bottom: '10%',
                  opacity: 0.5,
                  transform: 'scale(1)',
                }}
              />
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                  Mais Popular
                </div>
              )}

              {/* Plan Header */}
              <div 
                className="mb-6"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <h3 
                  className="text-xl font-bold text-foreground mb-1"
                  style={{
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    transform: 'translateZ(10px)',
                  }}
                >
                  {plan.name}
                </h3>
                <p 
                  className="text-sm text-muted-foreground mb-4"
                  style={{ transform: 'translateZ(5px)' }}
                >
                  {plan.subtitle}
                </p>
                <div 
                  className="flex items-baseline gap-1"
                  style={{ transform: 'translateZ(15px)' }}
                >
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div
                style={{
                  transform: 'translateZ(20px)',
                  transformStyle: 'preserve-3d',
                }}
              >
              <Button
                asChild
                variant={plan.featured ? "default" : "outline"}
                  className="w-full transition-transform duration-300 hover:scale-105"
                size="lg"
              >
                <Link to="/register">{plan.cta}</Link>
              </Button>
            </div>
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
