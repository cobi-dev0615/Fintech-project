import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Landmark, CreditCard, TrendingUp, Shield, Zap, PieChart, Users, FileText, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Landmark,
    title: "Integração Open Finance",
    description: "Conecte com segurança todas as suas contas bancárias através das APIs oficiais do Open Finance. Sincronização automática e dados consolidados em um só lugar.",
  },
  {
    icon: TrendingUp,
    title: "Acompanhamento de Portfólio B3",
    description: "Acompanhe suas ações, FIIs e BDRs com cotações em tempo real. Monitore dividendos e eventos corporativos.",
  },
  {
    icon: CreditCard,
    title: "Gestão de Cartões de Crédito",
    description: "Visualize todas as faturas em um só lugar. Insights de gastos por categoria e alertas de vencimento.",
  },
  {
    icon: PieChart,
    title: "Consolidação de Investimentos",
    description: "Veja seu portfólio completo em todas as corretoras. Analise alocação e performance em tempo real.",
  },
  {
    icon: Shield,
    title: "Segurança Bancária",
    description: "Criptografia de ponta a ponta, autenticação 2FA e acesso somente leitura. Seus dados sempre protegidos.",
  },
  {
    icon: Zap,
    title: "Insights Inteligentes",
    description: "Análise com IA das suas finanças. Recomendações personalizadas para otimizar seu dinheiro.",
  },
];

const consultantFeatures = [
  {
    icon: Users,
    title: "Área do Cliente",
    description: "Gerencie sua base de clientes, convide e acompanhe o status dos vínculos em tempo real.",
  },
  {
    icon: FileText,
    title: "Relatórios Personalizados",
    description: "Gere relatórios consolidados, de portfólio e planejamento financeiro com opção de white label.",
  },
  {
    icon: MessageSquare,
    title: "Mensagens",
    description: "Comunique-se com seus clientes diretamente na plataforma, com histórico organizado.",
  },
];

const FeaturesPage = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-20 bg-background">
        <div className="container max-w-5xl">
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Funcionalidades
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar suas finanças em um só lugar.
            </p>
          </div>

          <section className="mb-20">
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              Para você
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              Para consultores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {consultantFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="text-center pt-8">
            <Button asChild size="lg">
              <Link to="/register">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FeaturesPage;
