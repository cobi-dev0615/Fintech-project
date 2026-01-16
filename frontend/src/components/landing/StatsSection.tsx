const StatsSection = () => {
  const stats = [
    {
      number: "+50",
      suffix: "mil",
      title: "Usuários ativos",
      subtitle: "confiando no zurT para gerenciar suas finanças.",
    },
    {
      number: "+R$ 2",
      suffix: "bi",
      title: "Patrimônio consolidado",
      subtitle: "total de patrimônio gerenciado na plataforma.",
    },
    {
      number: "+500",
      suffix: "mil",
      title: "Transações sincronizadas",
      subtitle: "diariamente através do Open Finance.",
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Headline */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-16 max-w-4xl mx-auto">
          A plataforma que consolidou todas as soluções financeiras em um só lugar
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-colors"
            >
              {/* Number Display */}
              <div className="flex items-baseline gap-2 mb-4">
                <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-2 rounded-lg">
                  <span className="text-3xl font-bold">{stat.number}</span>
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
