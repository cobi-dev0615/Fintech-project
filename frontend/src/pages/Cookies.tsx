import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Cookies = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-20 bg-background">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Política de Cookies
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Última atualização: janeiro de 2026
          </p>
          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">O que são cookies</h2>
              <p>
                Cookies são pequenos arquivos de texto armazenados no seu dispositivo
                quando você visita nosso site ou usa nossa plataforma. Eles nos ajudam
                a manter sua sessão, lembrar preferências e melhorar a experiência de uso.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Como usamos cookies</h2>
              <p>
                Utilizamos cookies essenciais para autenticação e funcionamento da
                plataforma, cookies de preferências para lembrar configurações e,
                quando aplicável, cookies de análise para entender como os usuários
                utilizam nossos serviços (de forma agregada e anônima).
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Controle e escolhas</h2>
              <p>
                Você pode configurar seu navegador para bloquear ou excluir cookies.
                Observe que a desativação de cookies essenciais pode afetar o
                funcionamento do login e de partes da plataforma.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Atualizações</h2>
              <p>
                Esta política pode ser atualizada de tempos em tempos. A data da
                última atualização está indicada no topo da página. Dúvidas:
                entre em contato pelo canal de suporte.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cookies;
