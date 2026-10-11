"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

// Проверяем настройки по переменным сборки (без импорта библиотеки Supabase).
const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface AuthResult {
  ok: boolean;
  message: string;
  /** Информационное сообщение (не ошибка), например требование подтвердить email. */
  info?: boolean;
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

/** Клиент Supabase подгружается отдельным файлом только когда нужен. */
const loadClient = () =>
  import("@/lib/supabaseBrowser").then((m) => m.getSupabaseBrowser());

/** На публичной визитке вход не нужен — библиотеку авторизации не грузим вовсе. */
const isPublicPath = (p: string) => p.startsWith("/p/") || p.startsWith("/i/");

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const publicPage = isPublicPath(pathname);

  useEffect(() => {
    if (publicPage) {
      setLoading(false);
      return;
    }
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    setLoading(true);
    loadClient()
      .then((supabase) => {
        if (!mounted) return;
        if (!supabase) {
          setLoading(false);
          return;
        }
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
        unsubscribe = () => sub.subscription.unsubscribe();
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [publicPage]);

  const signIn = async (em: string, password: string): Promise<AuthResult> => {
    const supabase = await loadClient();
    if (!supabase) return { ok: false, message: "Авторизация недоступна." };
    const { error } = await supabase.auth.signInWithPassword({
      email: em.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, message: translateError(error.message) };
    return { ok: true, message: "" };
  };

  const signUp = async (em: string, password: string): Promise<AuthResult> => {
    const supabase = await loadClient();
    if (!supabase) return { ok: false, message: "Авторизация недоступна." };
    const { data, error } = await supabase.auth.signUp({
      email: em.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, message: translateError(error.message) };
    // Если включено подтверждение email — сессии не будет. Это не ошибка,
    // а информационное сообщение (регистрация прошла, нужно подтвердить email).
    if (!data.session) {
      return {
        ok: false,
        info: true,
        message: "Подтвердите email по ссылке в письме, затем войдите.",
      };
    }
    return { ok: true, message: "" };
  };

  const signOut = async () => {
    const supabase = await loadClient();
    if (supabase) await supabase.auth.signOut();
  };

  const resetPassword = async (em: string): Promise<AuthResult> => {
    const supabase = await loadClient();
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
    const supabase = await loadClient();
    if (!supabase) return { ok: false, message: "Авторизация недоступна." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, message: translateError(error.message) };
    return { ok: true, message: "" };
  };

  const value: AuthState = {
    email,
    userId,
    loading,
    // Берём из настроек сборки, а не из наличия клиента: на сервере клиента нет,
    // и раньше сервер рисовал страницу кабинета, а браузер — загрузку. Из-за
    // этого React перерисовывал всё заново (ошибки гидратации #418/#423).
    configured: isSupabaseConfigured,
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
