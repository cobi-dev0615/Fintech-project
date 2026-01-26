import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const GoogleAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token or code from URL params
        const token = searchParams.get("token");
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
          const errorMessage = searchParams.get("message") || 
            (error === "access_denied" 
              ? "Você cancelou a autenticação com Google" 
              : error === "account_pending"
              ? "Sua conta está aguardando aprovação do administrador"
              : "Erro ao autenticar com Google. Tente novamente.");
          
          toast({
            title: "Erro na autenticação",
            description: errorMessage,
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        if (token) {
          // If we have a token directly, store it and redirect
          localStorage.setItem("auth_token", token);
          
          // Fetch user info
          const apiBaseUrl = import.meta.env.VITE_API_URL || 
            (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') 
              ? 'http://localhost:5000/api' 
              : `${window.location.origin}/api`);
          
          const response = await fetch(`${apiBaseUrl}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            
            // Redirect based on role
            const role = data.user.role;
            if (role === 'admin') {
              navigate("/admin/dashboard");
            } else if (role === 'consultant') {
              navigate("/consultant/dashboard");
            } else {
              navigate("/app/dashboard");
            }
          } else {
            throw new Error("Failed to fetch user info");
          }
        } else {
          // No token or code, redirect to login
          toast({
            title: "Erro na autenticação",
            description: "Não foi possível completar a autenticação. Tente novamente.",
            variant: "destructive",
          });
          navigate("/login");
        }
      } catch (error: any) {
        console.error("Google auth callback error:", error);
        toast({
          title: "Erro na autenticação",
          description: error?.message || "Erro ao processar autenticação com Google. Tente novamente.",
          variant: "destructive",
        });
        navigate("/login");
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Processando autenticação...</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
