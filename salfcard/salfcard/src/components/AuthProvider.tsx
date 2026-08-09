"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

interface AuthResult {
  ok: boolean;
  message: string;
}

interface AuthState {
  email: string | null;
  userId: string | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthState | null>(null);

// Перевод типовых ошибок Supabase на русский.
function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Неверный email или пароль. Если аккаунта нет — зарегистрируйтесь.";
  }
  if (m.includes("user already registered")) {
    return "Пользователь с таким email уже зарегистрирован. Войдите.";
  }
  if (m.includes("password should be at least")) {
    return "Пароль должен быть не менее 6 символов.";
  }
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "Некорректный email.";
  }
  if (m.includes("email not confirmed")) {
    return "Email не подтверждён.";
  }
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user?.email ?? null);
      setUserId(data.session?.user?.id ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (em: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: "Авторизация недоступна." };
    const { error } = await supabase.auth.signInWithPassword({
      email: em.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, message: translateError(error.message) };
    return { ok: true, message: "" };
  };

  const signUp = async (em: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: "Авторизация недоступна." };
    const { data, error } = await supabase.auth.signUp({
      email: em.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, message: translateError(error.message) };
    // Если включено подтверждение email — сессии не будет.
    if (!data.session) {
      return {
        ok: false,
        message: "Подтвердите email по ссылке в письме, затем войдите.",
      };
    }
    return { ok: true, message: "" };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const resetPassword = async (em: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: "Авторизация недоступна." };
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(
      em.trim().toLowerCase(),
      { redirectTo }
    );
    if (error) return { ok: false, message: translateError(error.message) };
    return { ok: true, message: "" };
  };

  const updatePassword = async (password: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: "Авторизация недоступна." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, message: translateError(error.message) };
    return { ok: true, message: "" };
  };

  const value: AuthState = {
    email,
    userId,
    loading,
    configured: Boolean(supabase),
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // На случай использования вне провайдера — безопасная заглушка.
    return {
      email: null,
      userId: null,
      loading: false,
      configured: false,
      signIn: async () => ({ ok: false, message: "Авторизация недоступна." }),
      signUp: async () => ({ ok: false, message: "Авторизация недоступна." }),
      signOut: async () => {},
      resetPassword: async () => ({
        ok: false,
        message: "Авторизация недоступна.",
      }),
      updatePassword: async () => ({
        ok: false,
        message: "Авторизация недоступна.",
      }),
    };
  }
  return ctx;
}
