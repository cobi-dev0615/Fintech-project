import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Security = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-20 bg-background">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Segurança
          </h1>
          <p className="text-muted-foreground mb-8">
            Na zurT, a segurança dos seus dados financeiros é nossa prioridade.
          </p>
          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Criptografia</h2>
              <p>
                Todas as comunicações entre seu dispositivo e nossos servidores são criptografadas
                com TLS 1.3. Os dados sensíveis são armazenados de forma criptografada em repouso.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Open Finance</h2>
              <p>
                Utilizamos conexões seguras via Open Finance (Banco Central), sem armazenar suas
                credenciais bancárias. O acesso aos dados é feito por meio de APIs autorizadas
                e tokens de acesso revogáveis.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Controle de acesso</h2>
              <p>
                Autenticação robusta, sessões seguras e opção de autenticação em dois fatores
                para proteger sua conta. Apenas você decide o que compartilhar e com quem.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Conformidade</h2>
              <p>
                Seguimos as melhores práticas de segurança da informação e estamos em linha com
                as exigências do setor financeiro para proteção de dados pessoais (LGPD).
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Security;
