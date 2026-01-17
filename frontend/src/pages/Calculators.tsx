import { Link } from "react-router-dom";
import { Calculator, TrendingUp, Home, Coins, Percent } from "lucide-react";
import ChartCard from "@/components/dashboard/ChartCard";

const Calculators = () => {
  const calculators = [
    {
      id: "fire",
      name: "Calculadora FIRE",
      description: "Financial Independence, Retire Early - Calcule quanto precisa para alcançar independência financeira",
      icon: TrendingUp,
      color: "bg-blue-500/10 text-blue-500",
      href: "/app/calculators/fire",
    },
    {
      id: "compound",
      name: "Juros Compostos",
      description: "Calcule o valor futuro de seus investimentos com juros compostos",
      icon: Calculator,
      color: "bg-green-500/10 text-green-500",
      href: "/app/calculators/compound",
    },
    {
      id: "usufruct",
      name: "Calculadora de Usufruto",
      description: "Calcule o valor do usufruto e da nua propriedade em doações e heranças",
      icon: Home,
      color: "bg-purple-500/10 text-purple-500",
      href: "/app/calculators/usufruct",
    },
    {
      id: "itcmd",
      name: "Calculadora ITCMD",
      description: "Calcule o Imposto de Transmissão Causa Mortis e Doação",
      icon: Coins,
      color: "bg-orange-500/10 text-orange-500",
      href: "/app/calculators/itcmd",
    },
    {
      id: "profitability",
      name: "Simulador de Rentabilidade",
      description: "Compare diferentes cenários de investimento e rentabilidade",
      icon: Percent,
      color: "bg-pink-500/10 text-pink-500",
      href: "/app/calculators/profitability",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calculadoras Financeiras</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ferramentas para planejamento e análise financeira
          </p>
        </div>
      </div>

      {/* Calculators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {calculators.map((calculator) => (
          <Link key={calculator.id} to={calculator.href}>
            <ChartCard className="p-6 hover:border-primary/50 transition-colors cursor-pointer h-full">
              <div className="space-y-4">
                <div className={`w-12 h-12 rounded-lg ${calculator.color} flex items-center justify-center`}>
                  <calculator.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {calculator.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {calculator.description}
                  </p>
                </div>
              </div>
            </ChartCard>
          </Link>
        ))}
      </div>

      {/* Quick Access */}
      <ChartCard title="Acesso Rápido">
        <p className="text-sm text-muted-foreground mb-4">
          Selecione uma calculadora acima para começar. Todas as ferramentas são gratuitas e
          podem ser usadas quantas vezes precisar.
        </p>
        <div className="flex flex-wrap gap-2">
          {calculators.map((calc) => (
            <Link
              key={calc.id}
              to={calc.href}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              {calc.name}
            </Link>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};

export default Calculators;

