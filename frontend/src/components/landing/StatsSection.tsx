import { useState, useEffect, useRef } from "react";

const StatsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const stats = [
    {
      prefix: "+",
      target: 50,
      suffix: "mil",
      title: "Usuários ativos",
      subtitle: "confiando no zurT para gerenciar suas finanças.",
    },
    {
      prefix: "+R$ ",
      target: 2,
      suffix: "bi",
      title: "Patrimônio consolidado",
      subtitle: "total de patrimônio gerenciado na plataforma.",
    },
    {
      prefix: "+",
      target: 500,
      suffix: "mil",
      title: "Transações sincronizadas",
      subtitle: "diariamente através do Open Finance.",
    },
  ];

  // Intersection Observer to trigger animation when section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            // Reset when section is out of view
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

  const useCountUp = (target: number, duration: number = 2000, enabled: boolean = true) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!enabled) {
        // Reset to 0 when disabled
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
        const currentValue = Math.floor(startValue + (target - startValue) * easeOutCubic);
        
        setCount(currentValue);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          setCount(target);
        }
      };

      animationFrameId = requestAnimationFrame(animate);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }, [target, duration, enabled]);

    return count;
  };

  const StatCard = ({ stat, index }: { stat: typeof stats[0]; index: number }) => {
    const count = useCountUp(stat.target, 2000, isVisible);

  return (
            <div
              className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-colors"
            >
              {/* Number Display */}
              <div className="flex items-baseline gap-2 mb-4">
                <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-2 rounded-lg">
            <span className="text-3xl font-bold">
              {stat.prefix}
              {count.toLocaleString('pt-BR')}
            </span>
                </div>
                {stat.suffix && (
                  <div className="bg-foreground text-background px-2 py-1 rounded text-sm font-semibold">
                    {stat.suffix}
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-foreground mb-2">{stat.title}</h3>

              {/* Subtitle */}
              <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
            </div>
    );
  };

  return (
    <section id="contents" ref={sectionRef} className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Headline */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-16 max-w-4xl mx-auto">
          A plataforma que consolidou todas as soluções financeiras em um só lugar
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <StatCard key={index} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
