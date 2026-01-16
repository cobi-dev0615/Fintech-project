import { useState, useEffect } from 'react';
import { authService, User } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getCurrentUser(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    } else {
      setUser(null);
    }
  }, [currentUser]);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (data) => {
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
      setUser(data.user);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const logout = () => {
    authService.logout();
    setUser(null);
    queryClient.clear();
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
