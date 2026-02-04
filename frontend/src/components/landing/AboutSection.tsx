import { Landmark, BarChart3, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AboutSection = () => {
  const points = [
    {
      icon: Landmark,
      title: "Open Finance",
      description: "Integração segura de contas, investimentos e cartões em um só lugar.",
    },
    {
      icon: BarChart3,
      title: "Análise em tempo real",
      description: "Riscos e oportunidades identificados para você tomar melhores decisões.",
    },
    {
      icon: Users,
      title: "Para você e seu consultor",
      description: "Organize sua vida financeira ou gerencie sua base de clientes com relatórios profissionais.",
    },
    {
      icon: Shield,
      title: "Segurança",
      description: "Criptografia e acesso somente leitura. Seus dados protegidos.",
    },
  ];

  return (
    <section id="about" className="relative py-20 md:py-28 scroll-mt-20 bg-muted/30">
      <div className="container mx-auto px-6 sm:px-4">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Conheça a plataforma
          </h2>
          <p className="text-lg text-muted-foreground">
            Análise completa do seu patrimônio, objetivos e investimentos. Identificamos riscos e oportunidades em tempo real para você tomar as melhores decisões.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {points.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-6 rounded-xl bg-background border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/register">Começar agora</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
