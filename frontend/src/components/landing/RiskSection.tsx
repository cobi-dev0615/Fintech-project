import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const RiskSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Content */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Insights inteligentes e alertas em tempo real
            </h2>

            <p className="text-lg text-foreground/80">
              Receba alertas sobre vencimentos de faturas, saldos baixos, oportunidades de investimento e análise de risco da sua carteira. Tudo com inteligência artificial para te ajudar a tomar decisões mais informadas.
            </p>

            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/register">Acessar plataforma</Link>
            </Button>
          </div>

          {/* Right Section - Placeholder */}
          <div className="bg-card border border-border rounded-lg p-12 flex items-center justify-center min-h-[300px]">
            <p className="text-muted-foreground text-center">Visualização de riscos</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RiskSection;
