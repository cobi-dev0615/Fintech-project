import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-16">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
            <span className="font-semibold text-xl text-foreground">
              zurT
            </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Sua plataforma completa de consolidação financeira.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">Preços</Link></li>
              <li><Link to="/features" className="hover:text-foreground transition-colors">Funcionalidades</Link></li>
              <li><Link to="/security" className="hover:text-foreground transition-colors">Segurança</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">Sobre</Link></li>
              <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link to="/careers" className="hover:text-foreground transition-colors">Carreiras</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Termos de Serviço</Link></li>
              <li><Link to="/cookies" className="hover:text-foreground transition-colors">Política de Cookies</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 zurT. Todos os direitos reservados.</p>
          <p>Feito com cuidado para sua liberdade financeira.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
