import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

const GoalsSection = () => {
  const { t } = useTranslation('landing');

  const alerts = [
    t('goals.alert1'),
    t('goals.alert2'),
    t('goals.alert3'),
    t('goals.alert4'),
    t('goals.alert5'),
  ];

  // Calculate circular position for blur effect
  const getCircularBlur = (index: number, total: number) => {
    // Calculate angle in circular pattern (items spread in a circle)
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const radius = 150; // Radius of the circular pattern
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    // Calculate blur amount based on distance from center (very subtle for visibility)
    const distanceFromCenter = Math.sqrt(x * x + y * y);
    const maxBlur = 2; // Maximum blur amount (reduced for visibility)
    const blurAmount = (distanceFromCenter / radius) * maxBlur;

    return Math.max(0, blurAmount);
  };

  return (
    <section id="goals" className="py-20 bg-background scroll-mt-20">
      <div className="container mx-auto px-6 sm:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Content */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              {t('goals.heading')}
            </h2>

            <p className="text-lg text-foreground/80">
              {t('goals.description')}
            </p>

            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/register">{t('goals.cta')}</Link>
            </Button>
          </div>

          {/* Right Section - Alerts Card */}
          <div className="bg-card border border-border rounded-lg p-6 overflow-hidden">
            <div className="relative h-[400px] overflow-hidden">
              {/* Animated container - duplicated multiple times for seamless loop */}
              <div
                className="absolute w-full animate-scrollUp"
                style={{
                  willChange: 'transform',
                  top: 0,
                  left: 0,
                }}
              >
                {/* Triple the alerts array to ensure continuous flow */}
                {[...alerts, ...alerts, ...alerts].map((alert, index) => {
                  return (
                    <div
                      key={`alert-${index}`}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-all duration-300 mb-3 bg-card/50"
                      style={{
                        filter: 'blur(0px)',
                        opacity: 1,
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">{alert}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoalsSection;
