import { Landmark, BarChart3, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const AboutSection = () => {
  const { t } = useTranslation('landing');

  const points = [
    {
      icon: Landmark,
      titleKey: "about.openFinance.title",
      descKey: "about.openFinance.description",
    },
    {
      icon: BarChart3,
      titleKey: "about.realTimeAnalysis.title",
      descKey: "about.realTimeAnalysis.description",
    },
    {
      icon: Users,
      titleKey: "about.forYouAndConsultant.title",
      descKey: "about.forYouAndConsultant.description",
    },
    {
      icon: Shield,
      titleKey: "about.security.title",
      descKey: "about.security.description",
    },
  ];

  return (
    <section id="about" className="relative py-20 md:py-28 scroll-mt-20 bg-muted/30">
      <div className="container mx-auto px-6 sm:px-4">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('about.heading')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('about.description')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {points.map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="p-6 rounded-xl bg-background border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t(titleKey)}</h3>
              <p className="text-sm text-muted-foreground">{t(descKey)}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/register">{t('about.cta')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
