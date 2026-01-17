import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Building2, TrendingUp, CreditCard, Wallet, BarChart3, Shield, Zap, PieChart, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const DecisionSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to trigger animation when section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const useCountUp = (target: number, duration: number = 2000, enabled: boolean = true, decimals: number = 0) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!enabled) {
        setCount(0);
        return;
      }

      let startTime: number | null = null;
      let animationFrameId: number;
      const startValue = 0;

      const animate = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (target - startValue) * easeOutCubic;
        
        if (decimals === 0) {
          setCount(Math.floor(currentValue));
        } else {
          setCount(Number(currentValue.toFixed(decimals)));
        }

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          if (decimals === 0) {
            setCount(target);
          } else {
            setCount(Number(target.toFixed(decimals)));
          }
        }
      };

      animationFrameId = requestAnimationFrame(animate);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }, [target, duration, enabled, decimals]);

    return count;
  };

  const PatrimonioValue = useCountUp(250, 2000, isVisible, 0);
  const RendimentoValue = useCountUp(12.5, 2000, isVisible, 1);
  const AtivosValue = useCountUp(24, 2000, isVisible, 0);

  // Bar chart values - create hooks for each bar at the component level
  const barChartValues = [40, 65, 45, 75, 55, 85, 70, 60, 80, 75];
  const bar1 = useCountUp(barChartValues[0], 2000, isVisible, 0);
  const bar2 = useCountUp(barChartValues[1], 2000, isVisible, 0);
  const bar3 = useCountUp(barChartValues[2], 2000, isVisible, 0);
  const bar4 = useCountUp(barChartValues[3], 2000, isVisible, 0);
  const bar5 = useCountUp(barChartValues[4], 2000, isVisible, 0);
  const bar6 = useCountUp(barChartValues[5], 2000, isVisible, 0);
  const bar7 = useCountUp(barChartValues[6], 2000, isVisible, 0);
  const bar8 = useCountUp(barChartValues[7], 2000, isVisible, 0);
  const bar9 = useCountUp(barChartValues[8], 2000, isVisible, 0);
  const bar10 = useCountUp(barChartValues[9], 2000, isVisible, 0);
  const animatedBarHeights = [bar1, bar2, bar3, bar4, bar5, bar6, bar7, bar8, bar9, bar10];

  // Function to determine bar color based on height level
  const getBarColor = (height: number) => {
    if (height <= 50) {
      // Low level - blue/primary
      return "from-primary to-primary/40";
    } else if (height <= 70) {
      // Medium level - success/green
      return "from-success to-success/40";
    } else {
      // High level - accent/teal
      return "from-accent to-accent/40";
    }
  };

  return (
    <section ref={sectionRef} className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 rounded-2xl p-6 relative overflow-hidden min-h-[550px] shadow-2xl">
              {/* Background Elements */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-success/5 rounded-full blur-3xl" />

              {/* Main Dashboard Container */}
              <div className="relative z-10 grid grid-cols-2 gap-4 min-h-[500px]">
                {/* Central Dashboard Card - Spans both columns */}
                <div className="col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-5 border border-primary/20 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Dashboard Unificado</h3>
                        <p className="text-xs text-muted-foreground">Visão consolidada</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                  
                  {/* Mock Chart Area */}
                  <div className="h-24 bg-background/50 rounded-lg p-3 flex items-end justify-between gap-1 mb-3">
                    {barChartValues.map((targetHeight, i) => (
                      <div 
                        key={i}
                        className="flex-1 bg-gradient-to-t rounded-t transition-all hover:opacity-80 relative overflow-hidden"
                        style={{ 
                          height: `${animatedBarHeights[i]}%`,
                        }}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-t ${getBarColor(targetHeight)} rounded-t`} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Patrimônio</p>
                      <p className="text-sm font-bold text-foreground">
                        R$ {PatrimonioValue.toLocaleString('pt-BR')}k
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Rendimento</p>
                      <p className="text-sm font-bold text-success flex items-center justify-center gap-1">
                        <ArrowUpRight className="h-3 w-3" />
                        +{RendimentoValue.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Ativos</p>
                      <p className="text-sm font-bold text-foreground">{AtivosValue}</p>
                    </div>
                  </div>
                </div>

                {/* Open Finance Integration Card - Top Left */}
                <div 
                  className="bg-gradient-to-br from-blue-500/20 via-blue-600/15 to-purple-500/20 backdrop-blur-sm border border-blue-400/40 rounded-xl p-4 transition-all group relative overflow-hidden hover:scale-105 hover:rotate-1"
                  style={{
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2), 0 4px 16px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-400/20 rounded-full blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-xl" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500/30 to-blue-600/20 rounded-lg shadow-lg border border-blue-400/30">
                        <Shield className="h-5 w-5 text-blue-300 drop-shadow-lg" />
                      </div>
                      <Building2 className="h-4 w-4 text-blue-400/80 drop-shadow-md" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground mb-1 drop-shadow-sm">Open Finance</h4>
                    <p className="text-xs text-muted-foreground mb-2">APIs oficiais brasileiras</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-md border border-green-400/30 shadow-sm">
                        <Zap className="h-3 w-3 text-green-400" />
                        <span className="text-[10px] font-semibold text-green-300">Sync 4h</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* B3 Integration Card - Top Right */}
                <div 
                  className="bg-gradient-to-br from-emerald-500/20 via-green-600/15 to-teal-500/20 backdrop-blur-sm border border-emerald-400/40 rounded-xl p-4 transition-all group relative overflow-hidden hover:scale-105 hover:-rotate-1"
                  style={{
                    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2), 0 4px 16px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-400/20 rounded-full blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-xl" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-gradient-to-br from-emerald-500/30 to-green-600/20 rounded-lg shadow-lg border border-emerald-400/30">
                        <BarChart3 className="h-5 w-5 text-emerald-300 drop-shadow-lg" />
                      </div>
                      <TrendingUp className="h-4 w-4 text-emerald-400/80 drop-shadow-md" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground mb-1 drop-shadow-sm">B3 Integrado</h4>
                    <p className="text-xs text-muted-foreground mb-2">Cotações em tempo real</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-emerald-500/25 to-green-500/25 text-emerald-300 rounded font-medium border border-emerald-400/30 shadow-sm">Ações</span>
                      <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-emerald-500/25 to-green-500/25 text-emerald-300 rounded font-medium border border-emerald-400/30 shadow-sm">FIIs</span>
                      <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-emerald-500/25 to-green-500/25 text-emerald-300 rounded font-medium border border-emerald-400/30 shadow-sm">BDRs</span>
                    </div>
                  </div>
                </div>

                {/* Accounts Card - Bottom Left */}
                <div 
                  className="bg-gradient-to-br from-purple-500/20 via-indigo-600/15 to-blue-500/20 backdrop-blur-sm border border-purple-400/40 rounded-xl p-4 transition-all group relative overflow-hidden hover:scale-105 hover:rotate-1"
                  style={{
                    boxShadow: '0 8px 32px rgba(168, 85, 247, 0.2), 0 4px 16px rgba(168, 85, 247, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-purple-400/20 rounded-full blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 bg-gradient-to-br from-purple-500/30 to-indigo-600/20 rounded-lg shadow-lg border border-purple-400/30">
                        <Wallet className="h-5 w-5 text-purple-300 drop-shadow-lg" />
                      </div>
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full border-2 border-purple-900/50 shadow-lg" />
                        <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full border-2 border-purple-900/50 shadow-lg" />
                        <div className="w-6 h-6 bg-gradient-to-br from-teal-400 to-teal-500 rounded-full border-2 border-purple-900/50 shadow-lg" />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-foreground mb-1 drop-shadow-sm">Contas Conectadas</h4>
                    <p className="text-xs text-muted-foreground">8 instituições ativas</p>
                </div>
              </div>

                {/* Credit Cards Card - Bottom Right */}
                <div 
                  className="bg-gradient-to-br from-teal-500/20 via-cyan-600/15 to-blue-500/20 backdrop-blur-sm border border-teal-400/40 rounded-xl p-4 transition-all group relative overflow-hidden hover:scale-105 hover:-rotate-1"
                  style={{
                    boxShadow: '0 8px 32px rgba(20, 184, 166, 0.2), 0 4px 16px rgba(20, 184, 166, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-teal-400/20 rounded-full blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent rounded-xl" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 bg-gradient-to-br from-teal-500/30 to-cyan-600/20 rounded-lg shadow-lg border border-teal-400/30">
                        <CreditCard className="h-5 w-5 text-teal-300 drop-shadow-lg" />
                      </div>
                      <div className="flex gap-1">
                        <div className="w-8 h-5 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded border-2 border-blue-300/40 shadow-lg" style={{ transform: 'perspective(100px) rotateY(-5deg)' }} />
                        <div className="w-8 h-5 bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 rounded border-2 border-teal-300/40 shadow-lg" style={{ transform: 'perspective(100px) rotateY(5deg)' }} />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-foreground mb-1 drop-shadow-sm">Cartões</h4>
                    <p className="text-xs text-muted-foreground">5 cartões consolidados</p>
              </div>
              </div>
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
