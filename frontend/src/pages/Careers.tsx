import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Careers = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-20 bg-background">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Carreiras
          </h1>
          <p className="text-muted-foreground mb-8">
            Junte-se ao time zurT e ajude a transformar a forma como as pessoas lidam com suas finanças.
          </p>
          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Por que a zurT?</h2>
              <p>
                Trabalhamos com tecnologia de ponta, Open Finance e foco em experiência do usuário.
                Valorizamos autonomia, aprendizado contínuo e um ambiente colaborativo.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Vagas abertas</h2>
              <p>
                No momento não temos vagas abertas publicadas. Se você tem interesse em fazer
                parte do nosso time, envie seu currículo e vamos guardar seu contato para
                futuras oportunidades.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Careers;
