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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={cn(
                "bg-card border rounded-lg p-6 flex flex-col relative transition-all",
                plan.featured
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border hover:border-primary/30"
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                  Mais Popular
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.subtitle}
                </p>
                <div className="flex items-baseline gap-1">
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
              <Button
                asChild
                variant={plan.featured ? "default" : "outline"}
                className="w-full"
                size="lg"
              >
                <Link to="/register">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
