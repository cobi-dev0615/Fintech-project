import { ArrowDown, TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ProfessionalHero = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-background pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Marketing Content */}
          <div className="space-y-8">
            {/* Tagline */}
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Consolidação Financeira Completa
            </p>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Todas as suas finanças em uma visão inteligente
            </h1>

            {/* Description */}
            <p className="text-lg text-foreground/80 max-w-xl">
              Conecte todas as suas contas bancárias, cartões de crédito e investimentos através do Open Finance. Tenha uma visão completa da sua saúde financeira com insights em tempo real e integração com a B3.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/register">Acessar plataforma</Link>
              </Button>
            </div>

            {/* Secondary Link */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
              <Link to="/#about" className="text-sm font-medium">
                Conheça o zurT
              </Link>
              <ArrowDown className="h-4 w-4 group-hover:translate-y-1 transition-transform" />
            </div>
          </div>

          {/* Right Section - Smartphone Showcase */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm">
              {/* Phone Glow Effect */}
              <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-3xl scale-110" />
              
              {/* Phone Frame */}
              <div className="relative bg-card border-2 border-border rounded-[3rem] p-4 shadow-2xl">
                {/* Phone Screen */}
                <div className="bg-background rounded-[2.5rem] overflow-hidden min-h-[600px] p-4">
                  {/* Patrimônio Card */}
                  <div className="mb-3 p-4 bg-card/80 backdrop-blur-sm border border-border rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground mb-1">Patrimônio Líquido</h3>
                        <p className="text-lg font-bold text-foreground mb-1">R$ 124.532</p>
                        <p className="text-xs text-success">+12,4% este mês</p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Card */}
                  <div className="mb-3 p-4 bg-card/80 backdrop-blur-sm border border-border rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground mb-1">Otimizar Renda Variável</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-success text-lg font-bold">▲ 40%</span>
                        </div>
                        <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                          <div className="bg-success h-1.5 rounded-full" style={{ width: "80%" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alert Card */}
                  <div className="p-3 bg-card/80 backdrop-blur-sm border border-warning/30 rounded-xl">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">
                        Esta empresa tem apresentado uma queda no seu lucro líquido
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionalHero;
