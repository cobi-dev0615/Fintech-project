import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, User } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const hasUnauthorizedError = useRef(false);
  const isOnLoginPage = location.pathname === '/login' || location.pathname === '/register';
  const [hasToken, setHasToken] = useState(() => {
    return typeof window !== 'undefined' ? !!localStorage.getItem('auth_token') : false;
  });

  // Update hasToken state when localStorage changes
  useEffect(() => {
    const checkToken = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      setHasToken(!!token);
    };
    
    checkToken();
    // Listen for storage changes (in case token is removed elsewhere)
    window.addEventListener('storage', checkToken);
    return () => window.removeEventListener('storage', checkToken);
  }, []);

  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getCurrentUser(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on mount if data exists
    refetchOnReconnect: false, // Prevent refetch on reconnect
    refetchInterval: false, // Disable any interval refetching
    enabled: !hasUnauthorizedError.current && !isOnLoginPage && hasToken, // Only run if conditions are met
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    } else {
      setUser(null);
    }
  }, [currentUser]);

  // Listen for 401 unauthorized events from API client
  useEffect(() => {
    let handled = false;
    
    const handleUnauthorized = (event: CustomEvent) => {
      // Prevent multiple handlers from firing
      if (handled || hasUnauthorizedError.current) return;
      handled = true;
      hasUnauthorizedError.current = true;
      
      const message = event.detail?.message || 'Sua sessão expirou. Por favor, faça login novamente.';
      
      // Immediately remove token to prevent further requests
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        setHasToken(false);
      }
      
      // Cancel all ongoing queries to prevent further requests
      queryClient.cancelQueries();
      queryClient.setQueryData(['auth', 'me'], null);
      
      // Clear user state and query cache
      setUser(null);
      queryClient.clear();
      authService.logout();
      
      // Only show toast and redirect if not already on login page
      if (!isOnLoginPage) {
        toast({
          title: 'Sessão Expirada',
          description: message,
          variant: 'destructive',
        });
        navigate('/login', { replace: true });
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized as EventListener);
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized as EventListener);
    };
  }, [queryClient, navigate, isOnLoginPage]);

  // Also handle query errors (for 401 from /auth/me specifically)
  useEffect(() => {
    if (error && !hasUnauthorizedError.current) {
      const apiError = error as any;
      if (apiError?.error?.includes('401') || apiError?.statusCode === 401 || apiError?.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
        hasUnauthorizedError.current = true;
        
        // Immediately remove token to prevent further requests
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          setHasToken(false);
        }
        
        // Cancel all ongoing queries to prevent further requests
        queryClient.cancelQueries();
        queryClient.setQueryData(['auth', 'me'], null);
        
        setUser(null);
        queryClient.clear();
        authService.logout();
        
        // Only show toast and redirect if not already on login page
        if (!isOnLoginPage) {
          toast({
            title: 'Sessão Expirada',
            description: 'Sua sessão expirou. Por favor, faça login novamente.',
            variant: 'destructive',
          });
          navigate('/login', { replace: true });
        }
      }
    }
  }, [error, queryClient, navigate, isOnLoginPage]);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (data) => {
      // Reset the unauthorized flag on successful login
      hasUnauthorizedError.current = false;
      setHasToken(true);
      setUser(data.user);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({
      full_name,
      email,
      password,
      role,
    }: {
      full_name: string;
      email: string;
      password: string;
      role?: 'customer' | 'consultant' | 'admin';
    }) => authService.register(full_name, email, password, role),
    onSuccess: (data) => {
      // Reset the unauthorized flag on successful registration
      hasUnauthorizedError.current = false;
      setHasToken(true);
      setUser(data.user);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const logout = () => {
    hasUnauthorizedError.current = false;
    authService.logout();
    setUser(null);
    queryClient.clear();
    queryClient.setQueryData(['auth', 'me'], null);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
