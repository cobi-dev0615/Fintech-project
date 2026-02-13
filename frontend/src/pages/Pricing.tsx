import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";

const Pricing = () => {
  const { formatCurrency } = useCurrency();

  const plans = [
    {
      name: "Grátis",
      price: formatCurrency(0),
      period: "para sempre",
      description: "Perfeito para começar",
      features: [
        { name: "Conexões bancárias", value: "3" },
        { name: "Histórico de dados", value: "7 dias" },
        { name: "Transações manuais", value: true },
        { name: "Painel básico", value: true },
        { name: "Integração B3", value: false },
        { name: "Sincronização de cartões", value: false },
        { name: "Relatórios personalizados", value: false },
        { name: "Suporte prioritário", value: false },
      ],
      cta: "Começar grátis",
      featured: false
    },
    {
      name: "Básico",
      price: formatCurrency(14),
      period: "por mês",
      description: "Para investidores casuais",
      features: [
        { name: "Conexões bancárias", value: "10" },
        { name: "Histórico de dados", value: "1 ano" },
        { name: "Transações manuais", value: true },
        { name: "Painel básico", value: true },
        { name: "Integração B3", value: true },
        { name: "Sincronização de cartões", value: false },
        { name: "Relatórios personalizados", value: false },
        { name: "Suporte prioritário", value: false },
      ],
      cta: "Assinar Básico",
      featured: false
    },
    {
      name: "Pro",
      price: formatCurrency(29),
      period: "por mês",
      description: "Controle financeiro total",
      features: [
        { name: "Conexões bancárias", value: "Ilimitadas" },
        { name: "Histórico de dados", value: "Ilimitado" },
        { name: "Transações manuais", value: true },
        { name: "Painel básico", value: true },
        { name: "Integração B3", value: true },
        { name: "Sincronização de cartões", value: true },
        { name: "Relatórios personalizados", value: true },
        { name: "Suporte prioritário", value: true },
      ],
      cta: "Assinar Pro",
      featured: true
    },
    {
      name: "Consultor",
      price: formatCurrency(99),
      period: "por mês",
      description: "Para assessores financeiros",
      features: [
        { name: "Conexões bancárias", value: "Ilimitadas" },
        { name: "Histórico de dados", value: "Ilimitado" },
        { name: "Contas de clientes", value: "50" },
        { name: "Relatórios white-label", value: true },
        { name: "Integração B3", value: true },
        { name: "Colaboração em equipe", value: true },
        { name: "Acesso à API", value: true },
        { name: "Suporte dedicado", value: true },
      ],
      cta: "Falar com vendas",
      featured: false
    },
    {
      name: "Empresarial",
      price: "Personalizado",
      period: "",
      description: "Para grandes organizações",
      features: [
        { name: "Conexões bancárias", value: "Ilimitadas" },
        { name: "Histórico de dados", value: "Ilimitado" },
        { name: "Contas de clientes", value: "Ilimitadas" },
        { name: "Relatórios white-label", value: true },
        { name: "Integrações personalizadas", value: true },
        { name: "Garantia SLA", value: true },
        { name: "Gerente de conta dedicado", value: true },
        { name: "Opção on-premise", value: true },
      ],
      cta: "Falar com vendas",
      featured: false
    },
  ];
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-20 bg-background">
        <div className="container">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Escolha seu plano
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comece grátis e faça upgrade conforme cresce. Todos os planos incluem teste gratuito de 14 dias.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto mb-16">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={cn(
                  "bg-card rounded-lg p-5 border transition-all duration-300 animate-fade-in-up flex flex-col",
                  plan.featured
                    ? "border-primary shadow-lg shadow-primary/10 relative lg:scale-105 z-10"
                    : "border-border hover:border-primary/50 hover:shadow-md"
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    Mais Popular
                  </div>
                )}

                <div className="text-center mb-5">
                  <h3 className="text-base font-semibold text-foreground mb-1">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-xs">/{plan.period === "forever" ? "sempre" : plan.period}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <ul className="space-y-2 mb-5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-2 text-xs">
                      {feature.value === false ? (
                        <X className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      )}
                      <span className={cn(
                        feature.value === false ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {feature.name}
                        {typeof feature.value === "string" && (
                          <span className="font-medium ml-1">({feature.value})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.featured ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                >
                  <Link to="/register">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Perguntas frequentes
            </h2>
            <p className="text-muted-foreground mb-8">
              Tem perguntas? Nós temos as respostas.
            </p>
            <Button asChild variant="outline">
              <Link to="/#faq">Ver todas as FAQs</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
