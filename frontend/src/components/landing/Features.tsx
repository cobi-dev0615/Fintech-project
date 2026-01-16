import { Landmark, CreditCard, TrendingUp, Shield, Zap, PieChart } from "lucide-react";

const features = [
  {
    icon: Landmark,
    title: "Integração Open Finance",
    description: "Conecte com segurança todas as suas contas bancárias através das APIs oficiais do Open Finance. Sincronização automática a cada 4 horas."
  },
  {
    icon: TrendingUp,
    title: "Acompanhamento de Portfólio B3",
    description: "Acompanhe suas ações, FIIs e BDRs com cotações em tempo real. Monitore dividendos e eventos corporativos."
  },
  {
    icon: CreditCard,
    title: "Gestão de Cartões de Crédito",
    description: "Visualize todas as faturas em um só lugar. Obtenha insights de gastos por categoria e nunca perca uma data de vencimento."
  },
  {
    icon: PieChart,
    title: "Consolidação de Investimentos",
    description: "Veja seu portfólio completo em todas as corretoras. Analise alocação e performance em tempo real."
  },
  {
    icon: Shield,
    title: "Segurança Bancária",
    description: "Criptografia de 256 bits, autenticação 2FA e acesso somente leitura. Seus dados estão sempre protegidos."
  },
  {
    icon: Zap,
    title: "Insights Inteligentes",
    description: "Análise com IA das suas finanças. Receba recomendações personalizadas para otimizar seu dinheiro."
  }
];

const Features = () => {
  return (
    <section className="py-24 bg-gray-950">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tudo que você precisa para gerenciar suas finanças
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Um conjunto completo de ferramentas para consolidar, analisar e otimizar sua vida financeira.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 bg-gray-900/50 hover:bg-gray-800/50 border border-gray-800 hover:border-orange-500/50 rounded-2xl transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
