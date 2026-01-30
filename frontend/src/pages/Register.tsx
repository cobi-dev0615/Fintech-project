import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/api";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refToken = searchParams.get("ref") || undefined;
  const { registerAsync, isRegistering } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<'customer' | 'consultant'>('customer');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviterName, setInviterName] = useState<string | null>(null);

  useEffect(() => {
    if (!refToken) return;
    authApi.getInvitationInfo(refToken).then((r) => setInviterName(r.inviterName)).catch(() => setInviterName(null));
  }, [refToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError("Você precisa aceitar os termos de serviço");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    try {
      const response = await registerAsync({ full_name: name, email, password, role, invitation_token: refToken });
      
      // Check if approval is required
      if (response?.requiresApproval || response?.user?.approval_status === 'pending') {
        setError(null);
        // Show success message and redirect to login
        alert("Registro realizado com sucesso! Sua conta está aguardando aprovação do administrador. Você receberá uma notificação quando sua conta for aprovada.");
        navigate("/login");
        return;
      }
      
      // Redirect based on user role (if already approved)
      const userRole = response?.user?.role || role;
      let redirectPath = "/app/dashboard"; // Default to customer dashboard
      
      if (userRole === 'consultant') {
        redirectPath = "/consultant/dashboard";
      }
      
      navigate(redirectPath);
    } catch (err: any) {
      setError(err?.error || "Erro ao criar conta. Tente novamente.");
    }
  };

  const handleGoogleSignUp = () => {
    // Google OAuth implementation
    const apiBaseUrl = import.meta.env.VITE_API_URL || 
      (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') 
        ? 'http://localhost:5000/api' 
        : `${window.location.origin}/api`);
    
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-blue-500 via-blue-600 to-teal-600">
      {/* Left side - Branding with Financial Capital Background */}
      <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-center items-center relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/photo_2026-01-14_17-01-46.jpg)',
          }}
        >
          {/* Fallback gradient if image doesn't load */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-teal-700" />
        </div>
        
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70" />
        
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 via-transparent to-transparent" />
        
        {/* Logo - Always visible at top */}
        <Link to="/" className="absolute top-12 left-12 flex items-center gap-2 relative z-20">
          <span className="font-semibold text-xl text-white drop-shadow-lg">
            zurT
          </span>
        </Link>
        
        {/* Content - Centered */}
        <div className="relative z-10 w-full max-w-lg space-y-6">
          {/* Register Image */}
          <div className="flex justify-center items-center mb-6">
            <div className="relative">
              <img 
                src="/register.png" 
                alt="Registro zurT" 
                className="h-48 md:h-56 lg:h-64 w-auto object-contain drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.5))',
                  opacity: 1,
                  visibility: 'visible',
                  display: 'block',
                  position: 'relative',
                  zIndex: 15,
                }}
                onError={(e) => {
                  console.error('❌ Failed to load register.png image');
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'block';
                  target.style.visibility = 'visible';
                  target.style.opacity = '1';
                  target.style.zIndex = '15';
                }}
                onLoad={(e) => {
                  console.log('✅ Register image loaded successfully');
                  const target = e.target as HTMLImageElement;
                  target.style.zIndex = '15';
                }}
              />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white leading-tight drop-shadow-lg text-center">
            Comece sua jornada para a clareza financeira
          </h1>
          <p className="text-white/95 text-lg drop-shadow-md text-center">
            Junte-se a milhares de usuários que assumiram o controle de suas finanças com o zurT.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
                <span className="text-white font-semibold text-sm">1</span>
              </div>
              <span className="text-white/95 font-medium drop-shadow-md">Conecte suas contas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
                <span className="text-white font-semibold text-sm">2</span>
              </div>
              <span className="text-white/95 font-medium drop-shadow-md">Veja sua imagem completa</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
                <span className="text-white font-semibold text-sm">3</span>
              </div>
              <span className="text-white/95 font-medium drop-shadow-md">Tome decisões mais inteligentes</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="font-semibold text-xl text-white">
                zurT
              </span>
            </Link>
          </div>
          
          <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-lg w-full">
            {/* Title */}
            <h2 className="text-2xl font-bold text-black mb-6 text-center">Cadastrar</h2>
            {inviterName && (
              <Alert className="mb-6 border-primary/30 bg-primary/5">
                <UserCheck className="h-4 w-4" />
                <AlertDescription>
                  Você foi convidado por <strong>{inviterName}</strong> para usar a plataforma.
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Google Sign Up Button - At the top */}
            <Button
              type="button"
              variant="outline"
              className="w-full border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 mb-6"
              size="lg"
              onClick={handleGoogleSignUp}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Entrar com Google
            </Button>
            
            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-black">OU</span>
              </div>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-white border-gray-300 rounded-lg text-black"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Endereço de email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white border-gray-300 rounded-lg text-black"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white border-gray-300 rounded-lg text-black"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white border-gray-300 rounded-lg text-black"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">
                    As senhas não coincidem
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role" className="text-black">Tipo de usuário</Label>
                <Select value={role} onValueChange={(value: 'customer' | 'consultant') => setRole(value)}>
                  <SelectTrigger id="role" className="bg-white border-gray-300 rounded-lg text-black">
                    <SelectValue placeholder="Selecione o tipo de usuário" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black">
                    <SelectItem value="customer">Cliente</SelectItem>
                    <SelectItem value="consultant">Consultor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm text-black font-normal leading-relaxed">
                  Eu concordo com os{" "}
                  <a href="https://www.mundoinvest.com.br/termos-de-uso" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Termos de Serviço</a>
                  {" "}e a{" "}
                  <a href="https://www.mundoinvest.com.br/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Política de Privacidade</a>
                </Label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg" 
                size="lg" 
                disabled={!acceptTerms || isRegistering || password !== confirmPassword}
              >
                {isRegistering ? "Criando conta..." : "Cadastrar"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-black">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-blue-600 font-medium hover:underline">
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
