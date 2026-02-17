import { TrendingUp, AlertTriangle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const PremiumHero = () => {
  const { t } = useTranslation('landing');

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
                alt={t('hero.altPerson')}
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

      <div className="container mx-auto px-6 sm:px-4 relative pt-28 sm:pt-36 md:pt-40 lg:pt-20 pb-16" style={{ zIndex: 10 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Marketing Content */}
          <div className="space-y-8 relative" style={{ zIndex: 20 }}>
            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              {t('hero.headlinePart1')}{" "}
              <span className="text-primary">{t('hero.headlineHighlight')}</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-foreground/80 max-w-xl">
              {t('hero.description')}
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/register">{t('hero.cta')}</Link>
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
                  alt={t('hero.altPhone')}
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

              {/* Floating Cards - Rise from bottom to top, desktop only */}
              <div className="absolute inset-0 hidden lg:block pointer-events-none" style={{ zIndex: 250 }}>
                {/* Card 1: Otimizar Renda Variável */}
                <div
                  className="absolute bottom-[-20px] right-[10px] animate-rise-float"
                  style={{ animationDelay: '0s' }}
                >
                  <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl w-48">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-primary animate-pulse" style={{ animationDuration: '2s' }} />
                      <h4 className="text-xs font-semibold text-foreground">{t('hero.floatingOptimize')}</h4>
                    </div>
                    <div className="inline-flex items-center px-2 py-1 rounded bg-success/20">
                      <span className="text-sm font-bold text-success">{t('hero.floatingOptimizeValue')}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Meta de Reserva */}
                <div
                  className="absolute bottom-[-20px] right-[60px] animate-rise-float"
                  style={{ animationDelay: '5s' }}
                >
                  <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-xl w-48">
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-success flex-shrink-0 mt-0.5 animate-pulse" style={{ animationDuration: '2s' }} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-foreground mb-1">{t('hero.floatingGoalTitle')}</h4>
                        <p className="text-sm font-bold text-foreground mb-0.5">{t('hero.floatingGoalAmount')}</p>
                        <p className="text-[10px] text-success">{t('hero.floatingGoalStatus')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Alerta */}
                <div
                  className="absolute bottom-[-20px] right-[-30px] animate-rise-float"
                  style={{ animationDelay: '10s' }}
                >
                  <div className="bg-card/60 backdrop-blur-md border border-warning/30 rounded-xl p-3 shadow-xl w-56">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5 animate-pulse" style={{ animationDuration: '2s' }} />
                      <p className="text-[10px] text-foreground leading-relaxed">
                        {t('hero.floatingAlert')}
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

export default PremiumHero;
