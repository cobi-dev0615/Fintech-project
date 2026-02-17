import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Bell, CreditCard, TrendingUp, Shield, PieChart, Zap, Activity, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

const RiskSection = () => {
  const { t } = useTranslation('landing');

  const insights = [
    {
      icon: CreditCard,
      type: "warning",
      title: t('risk.insightBillDueTitle'),
      value: t('risk.insightBillDueValue'),
      color: "from-warning/20 to-warning/5",
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      borderColor: "border-warning/30",
    },
    {
      icon: Wallet,
      type: "info",
      title: t('risk.insightLowBalanceTitle'),
      value: t('risk.insightLowBalanceValue'),
      color: "from-info/20 to-info/5",
      iconBg: "bg-info/10",
      iconColor: "text-info",
      borderColor: "border-info/30",
    },
    {
      icon: TrendingUp,
      type: "success",
      title: t('risk.insightOpportunityTitle'),
      value: t('risk.insightOpportunityValue'),
      color: "from-success/20 to-success/5",
      iconBg: "bg-success/10",
      iconColor: "text-success",
      borderColor: "border-success/30",
    },
    {
      icon: PieChart,
      type: "warning",
      title: t('risk.insightRiskAnalysisTitle'),
      value: t('risk.insightRiskAnalysisValue'),
      color: "from-warning/20 to-warning/5",
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      borderColor: "border-warning/30",
    },
  ];

  return (
    <section id="risk" className="py-20 pb-24 sm:pb-20 bg-background overflow-x-hidden scroll-mt-20">
      <div className="container mx-auto px-6 sm:px-4 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Section - Visualização de Insights e Alertas */}
          <div className="relative" style={{ perspective: '1000px' }}>
            <div 
              className="bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 rounded-2xl p-6 relative overflow-hidden min-h-[500px] shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-success/5 rounded-full blur-3xl" />

              {/* Header with AI Badge */}
              <div className="relative z-10 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{t('risk.alertsTitle')}</h3>
                      <p className="text-xs text-muted-foreground">{t('risk.updatedNow')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-primary">{t('risk.aiBadge')}</span>
                  </div>
                </div>
              </div>

              {/* Insights Cards Grid */}
              <div className="relative z-10 grid grid-cols-2 gap-3 mb-6" style={{ transformStyle: 'preserve-3d' }}>
                {insights.map((insight, index) => {
                  const Icon = insight.icon;
                  // Different 3D rotations for each card
                  const rotations = [
                    { rotateX: '2deg', rotateY: '-1deg' },
                    { rotateX: '-1deg', rotateY: '2deg' },
                    { rotateX: '1deg', rotateY: '1deg' },
                    { rotateX: '-2deg', rotateY: '-1deg' },
                  ];
                  const hoverRotations = [
                    { rotateX: '5deg', rotateY: '-3deg', translateZ: '20px' },
                    { rotateX: '-3deg', rotateY: '5deg', translateZ: '20px' },
                    { rotateX: '3deg', rotateY: '3deg', translateZ: '20px' },
                    { rotateX: '-5deg', rotateY: '-3deg', translateZ: '20px' },
                  ];
                  const rotation = rotations[index % rotations.length];
                  const hoverRotation = hoverRotations[index % hoverRotations.length];
                  
                  return (
                    <div
                      key={index}
                      className={`bg-gradient-to-br ${insight.color} border ${insight.borderColor} rounded-xl p-4 transition-all duration-300 group`}
                      style={{
                        transform: `perspective(1000px) rotateX(${rotation.rotateX}) rotateY(${rotation.rotateY}) translateZ(0)`,
                        transformStyle: 'preserve-3d',
                        willChange: 'transform',
                      }}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        target.style.transform = `perspective(1000px) rotateX(${hoverRotation.rotateX}) rotateY(${hoverRotation.rotateY}) translateZ(${hoverRotation.translateZ}) scale(1.05)`;
                        target.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget;
                        target.style.transform = `perspective(1000px) rotateX(${rotation.rotateX}) rotateY(${rotation.rotateY}) translateZ(0)`;
                        target.style.boxShadow = '';
                      }}
                    >
                      <div className="flex items-start gap-3" style={{ transformStyle: 'preserve-3d' }}>
                        <div 
                          className={`p-2 ${insight.iconBg} rounded-lg ${insight.iconColor} flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-xs font-medium text-muted-foreground mb-1 break-words">{insight.title}</p>
                          <p className="text-sm font-semibold text-foreground break-words line-clamp-2">{insight.value}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Risk Visualization Section */}
              <div 
                className="relative z-10 bg-background/40 rounded-xl p-5 border border-border/30 backdrop-blur-sm transition-all duration-300 group"
                style={{
                  transform: 'perspective(1000px) rotateX(1deg) translateZ(0)',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  target.style.transform = 'perspective(1000px) rotateX(-2deg) translateZ(15px) scale(1.02)';
                  target.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.25)';
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget;
                  target.style.transform = 'perspective(1000px) rotateX(1deg) translateZ(0)';
                  target.style.boxShadow = '';
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="h-4 w-4 text-foreground/60" />
                  <h4 className="text-sm font-semibold text-foreground">{t('risk.riskVisualization')}</h4>
                </div>
                
                {/* Risk Level Display */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('risk.portfolioRiskLevel')}</span>
                    <span className="text-xs font-bold text-warning bg-warning/10 px-2 py-1 rounded">{t('risk.moderate')}</span>
                  </div>
                  
                  {/* Risk Progress Bar */}
                  <div className="relative h-3 bg-background/60 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-success via-warning to-danger rounded-full transition-all duration-1000"
                      style={{ width: '55%' }}
                    />
                  </div>

                  {/* Risk Categories */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center">
                      <div className="h-12 bg-success/10 rounded-lg mb-2 flex items-end justify-center p-2">
                        <div className="w-full bg-success/50 rounded-t transition-all duration-1000" style={{ height: '40%' }} />
                      </div>
                      <p className="text-xs font-medium text-success">{t('risk.low')}</p>
                    </div>
                    <div className="text-center">
                      <div className="h-12 bg-warning/10 rounded-lg mb-2 flex items-end justify-center p-2">
                        <div className="w-full bg-warning/60 rounded-t transition-all duration-1000" style={{ height: '70%' }} />
                      </div>
                      <p className="text-xs font-medium text-warning">{t('risk.medium')}</p>
                    </div>
                    <div className="text-center">
                      <div className="h-12 bg-danger/10 rounded-lg mb-2 flex items-end justify-center p-2">
                        <div className="w-full bg-danger/50 rounded-t transition-all duration-1000" style={{ height: '25%' }} />
                      </div>
                      <p className="text-xs font-medium text-danger">{t('risk.high')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Content */}
          <div 
            className="space-y-6 min-w-0"
            style={{ 
              perspective: '1200px',
              transformStyle: 'preserve-3d',
            }}
          >
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground transition-all duration-500 break-words"
              style={{
                transform: 'perspective(1200px) rotateY(-2deg) translateZ(30px)',
                transformStyle: 'preserve-3d',
                textShadow: '0 4px 8px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
                willChange: 'transform',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.transform = 'perspective(1200px) rotateY(-4deg) translateZ(50px) scale(1.02)';
                target.style.textShadow = '0 8px 16px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.transform = 'perspective(1200px) rotateY(-2deg) translateZ(30px)';
                target.style.textShadow = '0 4px 8px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
            >
              {t('risk.heading')}
            </h2>

            <p 
              className="text-base sm:text-lg text-foreground/80 transition-all duration-500 break-words"
              style={{
                transform: 'perspective(1200px) rotateY(-1deg) translateZ(20px)',
                transformStyle: 'preserve-3d',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                willChange: 'transform',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.transform = 'perspective(1200px) rotateY(-2deg) translateZ(35px) scale(1.01)';
                target.style.textShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.transform = 'perspective(1200px) rotateY(-1deg) translateZ(20px)';
                target.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
            >
              {t('risk.description')}
            </p>

            <div
              style={{
                transform: 'perspective(1200px) rotateY(1deg) translateZ(25px)',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.transform = 'perspective(1200px) rotateY(2deg) translateZ(40px) scale(1.05)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.transform = 'perspective(1200px) rotateY(1deg) translateZ(25px)';
              }}
            >
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300">
              <Link to="/register">{t('risk.cta')}</Link>
            </Button>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RiskSection;
