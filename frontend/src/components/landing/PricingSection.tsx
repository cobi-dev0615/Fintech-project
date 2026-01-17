import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Gratuito",
    subtitle: "Ideal para começar",
    price: "R$ 0",
    period: "para sempre",
    features: [
      "1 conexão bancária",
      "Dashboard básico",
      "Cotações de mercado",
    ],
    cta: "Começar Grátis",
    featured: false,
  },
  {
    name: "Básico",
    subtitle: "Para quem quer mais",
    price: "R$ 29,90",
    period: "/mês",
    features: [
      "3 conexões bancárias",
      "Relatórios mensais",
      "Câmbio e Crédito",
      "Suporte por email",
    ],
    cta: "Assinar Básico",
    featured: false,
  },
  {
    name: "Profissional",
    subtitle: "Controle total",
    price: "R$ 79,90",
    period: "/mês",
    features: [
      "10 conexões bancárias",
      "IA Financeira",
      "Relatórios ilimitados",
      "Suporte prioritário",
      "Alertas personalizados",
    ],
    cta: "Assinar Pro",
    featured: true,
  },
];

const PricingSection = () => {
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
      </div>
    </section>
  );
};

export default PricingSection;
