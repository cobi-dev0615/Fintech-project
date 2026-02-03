import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-20 bg-background">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Termos de Serviço
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Última atualização: janeiro de 2026
          </p>
          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Aceitação</h2>
              <p>
                Ao acessar ou usar a plataforma zurT, você concorda com estes Termos de
                Serviço. Se não concordar, não utilize nossos serviços.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Descrição do serviço</h2>
              <p>
                A zurT oferece uma plataforma de consolidação financeira que permite
                conectar contas, visualizar patrimônio, gerar relatórios e utilizar
                ferramentas de planejamento. O uso de dados via Open Finance está
                sujeito à sua autorização e às regras do Banco Central.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Cadastro e conta</h2>
              <p>
                Você deve fornecer informações verdadeiras e manter sua senha em sigilo.
                É sua responsabilidade todas as atividades realizadas em sua conta.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Uso aceitável</h2>
              <p>
                É proibido usar a plataforma para fins ilegais, fraudar terceiros,
                violar direitos de propriedade intelectual ou interferir no
                funcionamento dos serviços. Reservamo-nos o direito de suspender
                ou encerrar contas em caso de violação.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Planos e pagamento</h2>
              <p>
                Planos pagos estão sujeitos aos preços e condições vigentes no momento
                da assinatura. A renovação pode ser mensal ou anual, conforme o plano
                escolhido. Políticas de reembolso estão descritas na página de planos
                ou em contato com o suporte.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Alterações</h2>
              <p>
                Podemos alterar estes termos periodicamente. Alterações relevantes
                serão comunicadas por e-mail ou aviso na plataforma. O uso continuado
                após as alterações constitui aceitação.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Contato</h2>
              <p>
                Para dúvidas sobre estes termos, utilize o canal de suporte indicado
                na plataforma ou no site.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
