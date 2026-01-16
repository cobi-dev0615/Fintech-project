import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const GoalsSection = () => {
  const alerts = [
    "Identificamos taxas escondidas nesse fundo de investimento",
    "Você não está protegido da inflação",
    "O risco da sua carteira está maior do que deveria",
    "Você está sem caixa para oportunidades",
    "Baixa diversificação de setores em FII's",
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Content */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Gestão completa de cartões e investimentos
            </h2>

            <p className="text-lg text-foreground/80">
              Visualize todas as faturas de cartão em um só lugar, acompanhe seus investimentos consolidados de todas as corretoras e receba alertas inteligentes sobre sua saúde financeira.
            </p>

            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/register">Acessar plataforma</Link>
            </Button>
          </div>

          {/* Right Section - Alerts Card */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{alert}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoalsSection;
