import { Car, TrendingUp, AlertTriangle, Target, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

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
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
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

      <div className="container mx-auto px-4 relative pt-20 pb-16" style={{ zIndex: 10 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Marketing Content */}
          <div className="space-y-8 relative" style={{ zIndex: 20 }}>
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

          {/* Right Section - Smartphone Image */}
          <div className="relative flex justify-center lg:justify-end items-center min-h-[600px] lg:min-h-[800px]" style={{ perspective: '1000px', zIndex: 200 }}>
            <div className="relative w-full max-w-3xl" style={{ position: 'relative', zIndex: 200, transformStyle: 'preserve-3d' }}>
              {/* Phone Image with Glow Effect */}
              <div 
                className="relative mx-auto w-[320px] lg:w-[400px] mt-8 lg:mt-0 animate-fade-in-up" 
                style={{ 
                  position: 'relative', 
                  zIndex: 200, 
                  animationDelay: '0.2s',
                  animationFillMode: 'forwards',
                  opacity: 1,
                  visibility: 'visible',
                  display: 'block',
                  pointerEvents: 'auto',
                }}
              >
                {/* Phone Glow Effect - Behind the image with pulse */}
                <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-3xl scale-110 animate-pulse-soft" style={{ zIndex: -1 }} />
                
                {/* Phone Image */}
                      <img
                  src="/phone-mokeup.png"
                  alt="zurT App no smartphone"
                  className="w-full h-auto block transition-transform duration-500 hover:scale-105"
                        style={{
                    filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.5))',
                    position: 'relative',
                    zIndex: 200,
                    opacity: 1,
                    visibility: 'visible',
                    display: 'block',
                    minHeight: '400px',
                    maxHeight: '600px',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    backgroundColor: 'transparent',
                  }}
                  onError={(e) => {
                    console.error('❌ Failed to load phone image from /phone-mokeup.png');
                    console.error('Make sure the file exists in /public/phone-mokeup.png');
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'block';
                    target.style.visibility = 'visible';
                    target.style.opacity = '1';
                    target.style.zIndex = '200';
                    target.style.position = 'relative';
                  }}
                  onLoad={(e) => {
                    console.log('✅ Phone image loaded successfully');
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'block';
                    target.style.visibility = 'visible';
                    target.style.opacity = '1';
                    target.style.zIndex = '200';
                    target.style.position = 'relative';
                    console.log('Image dimensions:', target.naturalWidth, 'x', target.naturalHeight);
                  }}
                />
              </div>

              {/* Floating Cards - Positioned around the phone (Desktop only) */}
              {/* Animated connecting lines from phone to cards */}
              <svg className="absolute inset-0 w-full h-full hidden lg:block pointer-events-none" style={{ opacity: 0.3, zIndex: 150 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Lines will be animated via CSS */}
              </svg>

              {/* Floating Card 1: Objetivo Carro - Top Right */}
              <div 
                className="absolute top-8 right-0 lg:right-0 -right-4 md:right-0 opacity-0 animate-fade-in-up"
                style={{ 
                  animationDelay: '0.5s',
                  animationFillMode: 'forwards',
                  zIndex: 250,
                }}
              >
                <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl w-40 md:w-48 lg:w-52 transform rotate-1 transition-[shadow,border-color,background-color] duration-[2000ms] hover:scale-105 hover:shadow-2xl hover:border-primary/50 hover:bg-card/80 group animate-float-right">
                  {/* Connecting line indicator pointing to phone */}
                  <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
                  <div className="flex items-start gap-2 mb-2">
                    <Car className="h-4 w-4 text-primary flex-shrink-0 mt-0.5 animate-pulse" style={{ animationDuration: '2s' }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground mb-1">Objetivo: Carro novo</h4>
                      <p className="text-sm font-bold text-foreground mb-1">R$ 115.000,00</p>
                      <p className="text-[10px] text-muted-foreground">67% concluído • 18 meses</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Card 2: Diversificação - Middle Left */}
              <div 
                className="absolute top-1/3 -left-4 md:-left-6 lg:-left-8 opacity-0 animate-fade-in-up"
                style={{ 
                  animationDelay: '0.7s',
                  animationFillMode: 'forwards',
                  zIndex: 250,
                }}
              >
                <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl w-36 md:w-40 lg:w-44 transform -rotate-1 transition-[shadow,border-color,background-color] duration-[2000ms] hover:scale-105 hover:shadow-2xl hover:border-primary/50 hover:bg-card/80 group animate-float-left">
                  {/* Connecting line indicator pointing to phone */}
                  <div className="absolute -right-4 top-1/2 w-4 h-0.5 bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
                  <div className="flex items-center gap-2 mb-2">
                    <PieChart className="h-4 w-4 text-primary animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.2s' }} />
                    <h4 className="text-xs font-semibold text-foreground">Diversificação</h4>
                  </div>
                  <p className="text-sm font-bold text-success">Equilibrada</p>
                </div>
              </div>

              {/* Floating Card 3: Otimizar Renda Variável - Middle Right */}
              <div 
                className="absolute top-1/2 right-0 -right-4 md:right-0 opacity-0 animate-fade-in-up"
                style={{ 
                  animationDelay: '0.9s',
                  animationFillMode: 'forwards',
                  zIndex: 250,
                }}
              >
                <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl w-40 md:w-44 lg:w-48 transform rotate-1 transition-[shadow,border-color,background-color] duration-[2000ms] hover:scale-105 hover:shadow-2xl hover:border-primary/50 hover:bg-card/80 group animate-float">
                  {/* Connecting line indicator pointing to phone */}
                  <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-primary animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
                    <h4 className="text-xs font-semibold text-foreground">Otimizar Renda Variável</h4>
                  </div>
                  <div className="inline-flex items-center px-2 py-1 rounded bg-success/20">
                    <span className="text-sm font-bold text-success">+8.2%</span>
                  </div>
                </div>
              </div>

              {/* Floating Card 4: Meta de Reserva - Bottom Left */}
              <div 
                className="absolute bottom-20 -left-4 md:-left-6 lg:-left-8 opacity-0 animate-fade-in-up"
                style={{ 
                  animationDelay: '1.1s',
                  animationFillMode: 'forwards',
                  zIndex: 250,
                }}
              >
                <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl w-36 md:w-40 lg:w-48 transform -rotate-1 transition-[shadow,border-color,background-color] duration-[2000ms] hover:scale-105 hover:shadow-2xl hover:border-primary/50 hover:bg-card/80 group animate-float-right">
                  {/* Connecting line indicator pointing to phone */}
                  <div className="absolute -right-4 top-1/2 w-4 h-0.5 bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-success flex-shrink-0 mt-0.5 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.6s' }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground mb-1">Meta de Reserva</h4>
                      <p className="text-sm font-bold text-foreground mb-0.5">R$ 50.000,00</p>
                      <p className="text-[10px] text-success">Concluído em abril</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Card 5: Alerta - Bottom Right */}
              <div 
                className="absolute bottom-8 right-0 -right-4 md:right-0 opacity-0 animate-fade-in-up"
                style={{ 
                  animationDelay: '1.3s',
                  animationFillMode: 'forwards',
                  zIndex: 250,
                }}
              >
                <div className="bg-card/60 backdrop-blur-md border border-warning/30 rounded-xl p-3 shadow-xl w-44 md:w-52 lg:w-56 transform rotate-1 transition-[shadow,border-color,background-color] duration-[2000ms] hover:scale-105 hover:shadow-2xl hover:border-warning/50 hover:bg-card/80 group animate-float-deep">
                  {/* Connecting line indicator pointing to phone */}
                  <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-warning/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-xl bg-warning/0 group-hover:bg-warning/5 transition-colors duration-300 pointer-events-none" />
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.8s' }} />
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
