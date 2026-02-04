import { BookOpen, Target, AlertTriangle, CreditCard } from "lucide-react";

const ContentsSection = () => {
  const items = [
    { id: "about", label: "Conheça a plataforma", icon: BookOpen },
    { id: "goals", label: "Metas e objetivos", icon: Target },
    { id: "risk", label: "Riscos e alertas", icon: AlertTriangle },
    { id: "tools", label: "Preços e planos", icon: CreditCard },
  ];

  return (
    <section id="contents" className="relative py-16 md:py-20 scroll-mt-20 bg-background">
      <div className="container mx-auto px-6 sm:px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Conteúdos
          </h2>
          <p className="text-muted-foreground mb-10">
            Tudo o que você encontra nesta página.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors text-left group"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(id);
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-medium text-foreground">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContentsSection;
