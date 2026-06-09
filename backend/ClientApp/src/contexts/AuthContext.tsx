/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { AuthUser } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading: loading } = useQuery<AuthUser | null>({
    queryKey: ['auth-me'],
    queryFn: () =>
      axios.get<AuthUser>('/api/auth/me', { withCredentials: true })
        .then(res => res.data)
        .catch(() => null),
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      axios.post<AuthUser>('/api/auth/login', { email, password }, { withCredentials: true })
        .then(res => res.data),
    onSuccess: data => queryClient.setQueryData(['auth-me'], data),
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      axios.post('/api/auth/logout', null, { withCredentials: true }),
    onSuccess: () => queryClient.setQueryData(['auth-me'], null),
  });

  async function login(email: string, password: string) {
    try {
      await loginMutation.mutateAsync({ email, password });
    } catch (err) {
      let msg = 'Login failed';
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as { error?: string; message?: string } | undefined;
        msg = body?.error ?? body?.message ?? msg;
      }
      throw new Error(msg);
    }
  }

  async function logout() {
    await logoutMutation.mutateAsync();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
