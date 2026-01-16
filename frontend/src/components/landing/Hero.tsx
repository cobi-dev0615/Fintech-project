import { ArrowRight, Shield, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gray-950 pt-20 pb-32">
      {/* MyRenda Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1s" }} />
      </div>
      
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge - MyRenda Style */}
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-full px-4 py-1.5 text-sm font-medium mb-8 animate-fade-in">
            <Zap className="h-4 w-4" />
            <span>Plataforma certificada Open Finance</span>
          </div>
          
          {/* Headline - MyRenda Gradient Text */}
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Todas as suas finanças,
            <br />
            <span className="gradient-text">em uma visão inteligente</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Conecte todas as suas contas bancárias, cartões de crédito e investimentos. 
            Tenha uma visão completa da sua saúde financeira com insights em tempo real.
          </p>
          
          {/* CTA Buttons - MyRenda Style */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Button asChild size="xl" variant="hero">
              <Link to="/register">
                Criar conta gratuita
                <ArrowRight className="h-5 w-5 ml-1" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="hero-outline">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
          
          {/* Trust indicators - MyRenda Style */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-400" />
              <span>Segurança bancária</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-400" />
              <span>Sincronização em tempo real</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-400 font-semibold">50K+</span>
              <span>Usuários ativos</span>
            </div>
          </div>
        </div>
        
        {/* Hero Image/Dashboard Preview - MyRenda Dark Style */}
        <div className="mt-16 relative animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <div className="max-w-5xl mx-auto">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
              {/* Mock dashboard header */}
              <div className="bg-gray-800 h-12 flex items-center px-4 gap-2 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              {/* Mock dashboard content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Patrimônio Líquido</div>
                  <div className="text-2xl font-bold text-white">R$ 124.532</div>
                  <div className="text-xs text-green-400 mt-1">+12,4% este mês</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Caixa Total</div>
                  <div className="text-2xl font-bold text-white">R$ 23.450</div>
                  <div className="text-xs text-gray-500 mt-1">3 contas</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Investimentos</div>
                  <div className="text-2xl font-bold text-white">R$ 98.200</div>
                  <div className="text-xs text-green-400 mt-1">+8,2% no ano</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Cartões de Crédito</div>
                  <div className="text-2xl font-bold text-white">R$ 2.882</div>
                  <div className="text-xs text-yellow-400 mt-1">Vence em 15 dias</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
