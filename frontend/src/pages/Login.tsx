import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login({ email, password });
      navigate("/app/dashboard");
    } catch (err: any) {
      setError(err?.error || "Erro ao fazer login. Verifique suas credenciais.");
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
            Bem-vindo de volta ao seu centro de comando financeiro
          </h1>
          <p className="text-primary-foreground/90 text-lg">
            Acesse todas as suas contas, investimentos e insights em um lugar seguro.
          </p>
        </div>
        
        <p className="text-primary-foreground/70 text-sm relative z-10">
          © 2026 zurT. Todos os direitos reservados.
        </p>
      </div>
      
      {/* Right side - Login Form */}
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
              <h2 className="text-2xl font-bold text-foreground mb-2">Entrar</h2>
              <p className="text-muted-foreground">
                Insira suas credenciais para acessar sua conta
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground">Senha</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
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
              </div>
              
              <Button type="submit" variant="default" className="w-full" size="lg" disabled={isLoggingIn}>
                {isLoggingIn ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  Crie uma
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
