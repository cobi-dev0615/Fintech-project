import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const About = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-20 bg-background">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Sobre a zurT
          </h1>
          <p className="text-muted-foreground mb-8">
            Sua plataforma completa de consolidação financeira.
          </p>
          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Nossa missão</h2>
              <p>
                Democratizar o acesso a ferramentas profissionais de gestão financeira,
                permitindo que pessoas e consultores tenham uma visão clara e consolidada
                de suas finanças em um só lugar.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">O que fazemos</h2>
              <p>
                Integramos contas bancárias, investimentos, cartões e dados do Open Finance
                em uma única plataforma. Oferecemos relatórios, metas, simuladores e
                suporte para consultores que desejam atender seus clientes com excelência.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Para quem</h2>
              <p>
                Para quem quer organizar a vida financeira pessoal e para consultores
                financeiros que precisam de uma ferramenta completa para gerenciar
                a base de clientes e entregar relatórios profissionais.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
