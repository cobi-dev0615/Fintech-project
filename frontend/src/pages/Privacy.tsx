import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-20 bg-background">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Política de Privacidade
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Última atualização: janeiro de 2026
          </p>
          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introdução</h2>
              <p>
                A zurT (&quot;nós&quot;, &quot;nosso&quot;) respeita sua privacidade e está comprometida
                com a proteção dos seus dados pessoais, em conformidade com a Lei Geral de
                Proteção de Dados (LGPD - Lei 13.709/2018). Esta política descreve como
                coletamos, usamos e protegemos suas informações.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Dados que coletamos</h2>
              <p>
                Coletamos dados que você nos fornece ao se cadastrar e usar a plataforma
                (nome, e-mail, telefone, dados de perfil), dados de uso da plataforma e,
                quando você autoriza, dados financeiros obtidos via Open Finance para
                consolidação e exibição na zurT.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Finalidade do tratamento</h2>
              <p>
                Utilizamos seus dados para fornecer e melhorar nossos serviços, processar
                pagamentos, cumprir obrigações legais e, quando aplicável, enviar
                comunicações sobre a plataforma (com sua autorização).
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Compartilhamento</h2>
              <p>
                Não vendemos seus dados. Podemos compartilhar dados com prestadores de
                serviços que nos auxiliam na operação (hospedagem, pagamentos, e-mail),
                sempre com contratos que garantem a proteção dos dados, ou quando
                exigido por lei.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Seus direitos</h2>
              <p>
                Você tem direito de acesso, correção, exclusão, portabilidade e revogação
                do consentimento, quando aplicável. Para exercer esses direitos, entre
                em contato conosco pelo e-mail de suporte ou pelas configurações da conta.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Contato</h2>
              <p>
                Dúvidas sobre esta política: entre em contato pelo e-mail de suporte
                disponível na plataforma ou em nosso site.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
