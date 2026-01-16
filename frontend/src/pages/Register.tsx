import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

const Register = () => {
  const navigate = useNavigate();
  const { register, isRegistering } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError("Você precisa aceitar os termos de serviço");
      return;
    }

    try {
      await register({ full_name: name, email, password });
      navigate("/app/dashboard");
    } catch (err: any) {
      setError(err?.error || "Erro ao criar conta. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-accent p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <span className="font-semibold text-xl text-primary-foreground">
            zurT
          </span>
        </Link>
        
        <div className="space-y-6 relative z-10">
          <h1 className="text-4xl font-bold text-primary-foreground leading-tight">
            Comece sua jornada para a clareza financeira
          </h1>
          <p className="text-primary-foreground/90 text-lg">
            Junte-se a milhares de usuários que assumiram o controle de suas finanças com o zurT.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/30">
                <span className="text-primary-foreground font-semibold text-sm">1</span>
              </div>
              <span className="text-primary-foreground/90">Conecte suas contas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/30">
                <span className="text-primary-foreground font-semibold text-sm">2</span>
              </div>
              <span className="text-primary-foreground/90">Veja sua imagem completa</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/30">
                <span className="text-primary-foreground font-semibold text-sm">3</span>
              </div>
              <span className="text-primary-foreground/90">Tome decisões mais inteligentes</span>
            </div>
          </div>
        </div>
        
        <p className="text-primary-foreground/70 text-sm relative z-10">
          © 2026 zurT. Todos os direitos reservados.
        </p>
      </div>
      
      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="font-semibold text-xl text-foreground">
                zurT
              </span>
            </Link>
          </div>
          
          <div className="bg-card rounded-lg p-8 border border-border shadow-lg w-full">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Criar conta</h2>
              <p className="text-muted-foreground">
                Comece seu teste gratuito de 14 dias hoje
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Crie uma senha forte"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deve ter pelo menos 8 caracteres
                </p>
              </div>
              
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground font-normal leading-relaxed">
                  Eu concordo com os{" "}
                  <Link to="/terms" className="text-primary hover:underline">Termos de Serviço</Link>
                  {" "}e a{" "}
                  <Link to="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>
                </Label>
              </div>
              
              <Button type="submit" variant="default" className="w-full" size="lg" disabled={!acceptTerms || isRegistering}>
                {isRegistering ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Entrar
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
