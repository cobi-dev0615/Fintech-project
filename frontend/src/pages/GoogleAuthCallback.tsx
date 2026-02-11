import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const GoogleAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['auth', 'common']);
  const queryClient = useQueryClient();

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
              ? t('googleAuth.cancelledAuth')
              : error === "account_pending"
              ? t('googleAuth.accountPending')
              : t('googleAuth.genericError'));

          toast({
            title: t('googleAuth.authError'),
            description: errorMessage,
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        if (token) {
          // Store token in localStorage and API client
          localStorage.setItem("auth_token", token);
          api.setToken(token);

          // Fetch user info to get role for redirect
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

            // Update the query cache with the user data
            queryClient.setQueryData(['auth', 'me'], data.user);

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
            title: t('googleAuth.authError'),
            description: t('googleAuth.couldNotComplete'),
            variant: "destructive",
          });
          navigate("/login");
        }
      } catch (error: any) {
        console.error("Google auth callback error:", error);
        toast({
          title: t('googleAuth.authError'),
          description: error?.message || t('googleAuth.processingError'),
          variant: "destructive",
        });
        navigate("/login");
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast, queryClient, user, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">{t('googleAuth.processing')}</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
