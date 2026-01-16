import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const DecisionSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Visual */}
          <div className="relative">
            <div className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden">
              {/* Background Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

              {/* Person Illustration Placeholder */}
              <div className="relative z-10 flex items-center justify-center min-h-[400px]">
                <div className="w-64 h-64 bg-muted rounded-full flex items-center justify-center">
                  <div className="text-6xl">👤</div>
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-4 left-4 bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Objetivo de liquidez</span>
              </div>
              <div className="absolute top-4 right-4 bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Objetivo de rentabilidade</span>
              </div>
              <div className="absolute top-1/2 right-4 bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Perfil Agressivo</span>
              </div>
            </div>
          </div>

          {/* Right Section - Content */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Integração completa com Open Finance e B3
            </h2>

            <div className="space-y-4 text-foreground/80">
              <p>
                Conecte-se com segurança através das APIs oficiais do Open Finance brasileiro. Sincronização automática a cada 4 horas.
              </p>
              <p>
                Importe automaticamente suas posições de ações, FIIs e BDRs diretamente da B3 com cotações em tempo real.
              </p>
              <p>
                Tenha visibilidade completa de todas as suas contas, cartões e investimentos em um único dashboard.
              </p>
            </div>

            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/register">Acessar plataforma</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DecisionSection;
