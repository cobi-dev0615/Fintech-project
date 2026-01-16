import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "para sempre",
    description: "Perfeito para começar",
    features: [
      "3 conexões bancárias",
      "Painel básico",
      "Lançamento manual de transações",
      "Histórico de 7 dias"
    ],
    cta: "Começar grátis",
    featured: false
  },
  {
    name: "Pro",
    price: "R$ 29",
    period: "por mês",
    description: "Para quem quer controle total",
    features: [
      "Conexões bancárias ilimitadas",
      "Integração com portfólio B3",
      "Acompanhamento de cartões",
      "Histórico ilimitado",
      "Relatórios personalizados",
      "Suporte prioritário"
    ],
    cta: "Assinar Pro",
    featured: true
  },
  {
    name: "Business",
    price: "R$ 99",
    period: "por mês",
    description: "Para assessores e consultores",
    features: [
      "Tudo do Pro",
      "Até 50 contas de clientes",
      "Relatórios white-label",
      "Colaboração em equipe",
      "Acesso à API",
      "Suporte dedicado"
    ],
    cta: "Falar com vendas",
    featured: false
  }
];

const PricingSection = () => {
  return (
    <section className="py-24 bg-gray-950">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Preços simples e transparentes
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Escolha o plano que melhor se adapta às suas necessidades. Faça upgrade ou downgrade a qualquer momento.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={cn(
                "bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 animate-fade-in-up",
                plan.featured
                  ? "border-orange-500 shadow-xl shadow-orange-500/10 scale-105 relative"
                  : "border-gray-800 hover:border-orange-500/50 hover:shadow-lg"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Mais Popular
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 text-sm">/{plan.period === "forever" ? "sempre" : plan.period}</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">{plan.description}</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                asChild
                variant={plan.featured ? "hero" : "outline"}
                className="w-full"
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
