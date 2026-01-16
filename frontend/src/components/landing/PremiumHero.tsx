import { ArrowDown, Car, TrendingUp, AlertTriangle, Wallet, Target, PieChart, Flashlight, Camera, Signal, Wifi, Battery } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PremiumHero = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-background overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0">
        {/* Urban background placeholder - in production, this would be an actual image */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
        {/* Subtle pattern overlay */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Blue gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-primary/5" />

      {/* Person Image - Full Section Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-end">
          <div className="relative w-full h-full">
            {/* Person image with subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-accent/20 blur-2xl" />
            <div className="relative w-full h-full">
              <img
                src="/photo_2026-01-14_17-01-46.jpg"
                alt="Profissional usando smartphone"
                className="w-full h-full object-cover object-right-center"
                style={{
                  maskImage: 'radial-gradient(ellipse 100% 100% at 70% 50%, black 70%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 70% 50%, black 70%, transparent 100%)',
                }}
              />
              {/* Gradient overlays on all edges to blend with background */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-l from-background via-transparent to-transparent opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background opacity-60" />
              {/* Corner gradients for smoother blending */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-background via-transparent to-transparent opacity-50" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-background via-transparent to-transparent opacity-50" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-background via-transparent to-transparent opacity-50" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-background via-transparent to-transparent opacity-50" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Marketing Content */}
          <div className="space-y-8 relative z-20">
            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Sua vida financeira,{" "}
              <span className="text-primary">inteligente.</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-foreground/80 max-w-xl">
              Análise completa do seu patrimônio, objetivos e investimentos. Identificamos riscos e oportunidades em tempo real para você tomar as melhores decisões.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/register">Começar agora</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border hover:bg-muted">
                <Link to="/#about">Conhecer a plataforma</Link>
              </Button>
            </div>
          </div>

          {/* Right Section - Smartphone and Floating Cards */}
          <div className="relative flex justify-center lg:justify-end items-center min-h-[600px] lg:min-h-[800px]">
            <div className="relative w-full max-w-3xl">

              {/* Smartphone Frame - Positioned in front of person */}
              <div className="relative z-20 mx-auto w-[280px] h-[600px] lg:w-[320px] lg:h-[690px] mt-8 lg:mt-0">
                {/* Phone Glow Effect */}
                <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-3xl scale-110" />
                
                {/* Phone Frame - Realistic proportions */}
                <div className="relative bg-gray-900/80 backdrop-blur-sm border-[3px] border-gray-700/50 rounded-[2.5rem] p-[6px] shadow-2xl">
                  {/* Status Bar Area (notch simulation) */}
                  <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[120px] h-[24px] bg-black rounded-b-[12px] z-10" />
                  
                  {/* Phone Screen - Blurred background with notifications */}
                  <div className="relative rounded-[2rem] overflow-hidden h-full">
                    {/* Blurred background image */}
                    <div className="absolute inset-0">
                      <img
                        src="/photo_2026-01-14_17-01-46.jpg"
                        alt="Background"
                        className="w-full h-full object-cover object-center scale-150"
                        style={{
                          filter: 'blur(20px) brightness(0.2)',
                        }}
                      />
                    </div>
                    
                    {/* Status Bar */}
                    <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-4 pt-1 z-20">
                      <span className="text-white text-xs font-medium">09:41</span>
                      <div className="flex items-center gap-1.5">
                        <Signal className="h-3.5 w-3.5 text-white" />
                        <Wifi className="h-3.5 w-3.5 text-white" />
                        <Battery className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                    
                    {/* Notification Cards - Centered */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 z-20">
                      {/* Notification Card 1 */}
                      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 shadow-xl w-full max-w-[260px]">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white mb-1">Prejuízo no lucro líquido</h4>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              Esta empresa tem apresentado prejuízo no lucro líquido
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Notification Card 2 */}
                      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 shadow-xl w-full max-w-[260px]">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white mb-1">Taxa de administração alta</h4>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              A taxa de administração é muito acima do informado em lâmina.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom Icons and Home Gesture */}
                    <div className="absolute bottom-0 left-0 right-0 z-20">
                      {/* Home Gesture Line */}
                      <div className="flex justify-center mb-3">
                        <div className="w-32 h-1 bg-white/30 rounded-full" />
                      </div>
                      
                      {/* Bottom Action Icons */}
                      <div className="flex items-center justify-between px-8 pb-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <Flashlight className="h-5 w-5 text-white" />
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <Camera className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards - Positioned around the phone (Desktop only) */}
              {/* Floating Card 1: Objetivo Carro - Top Right */}
              <div className="absolute top-8 right-0 hidden lg:block z-30">
                <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl w-52 transform rotate-1">
                  <div className="flex items-start gap-2 mb-2">
                    <Car className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground mb-1">Objetivo: Carro novo</h4>
                      <p className="text-sm font-bold text-foreground mb-1">R$ 115.000,00</p>
                      <p className="text-[10px] text-muted-foreground">67% concluído • 18 meses</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Card 2: Diversificação - Middle Left */}
              <div className="absolute top-1/3 -left-8 hidden lg:block z-30">
                <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl w-44 transform -rotate-1">
                  <div className="flex items-center gap-2 mb-2">
                    <PieChart className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-semibold text-foreground">Diversificação</h4>
                  </div>
                  <p className="text-sm font-bold text-success">Equilibrada</p>
                </div>
              </div>

              {/* Floating Card 3: Otimizar Renda Variável - Middle Right */}
              <div className="absolute top-1/2 right-0 hidden lg:block z-30">
                <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl w-48 transform rotate-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <h4 className="text-xs font-semibold text-foreground">Otimizar Renda Variável</h4>
                  </div>
                  <div className="inline-flex items-center px-2 py-1 rounded bg-success/20">
                    <span className="text-sm font-bold text-success">+8.2%</span>
                  </div>
                </div>
              </div>

              {/* Floating Card 4: Meta de Reserva - Bottom Left */}
              <div className="absolute bottom-20 -left-8 hidden lg:block z-30">
                <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl w-48 transform -rotate-1">
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground mb-1">Meta de Reserva</h4>
                      <p className="text-sm font-bold text-foreground mb-0.5">R$ 50.000,00</p>
                      <p className="text-[10px] text-success">Concluído em abril</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Card 5: Alerta - Bottom Right */}
              <div className="absolute bottom-8 right-0 hidden lg:block z-30">
                <div className="bg-card/60 backdrop-blur-md border border-warning/30 rounded-xl p-3 shadow-xl w-56 transform rotate-1">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-foreground leading-relaxed">
                      Concentração em renda fixa elevada
                    </p>
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

export default PremiumHero;
