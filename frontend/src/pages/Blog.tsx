import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";

const Blog = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-20 bg-background">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Blog
          </h1>
          <p className="text-muted-foreground mb-8">
            Dicas, novidades e conteúdo sobre educação financeira e gestão do seu dinheiro.
          </p>
          <div className="space-y-6 text-muted-foreground">
            <p>
              Em breve você encontrará aqui artigos sobre planejamento financeiro,
              Open Finance, investimentos e melhores práticas para consultores.
            </p>
            <p>
              Enquanto isso, explore nossa plataforma e comece a consolidar suas finanças.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center text-primary hover:underline font-medium"
            >
              Criar conta grátis →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
