"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { useAuth } from "@/components/AuthProvider";

/** Обёртка для страниц, доступных только авторизованным пользователям. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const { email, loading, configured } = useAuth();
  const router = useRouter();
  const currentEmail = useStore((s) => s.currentEmail);
  const setActiveAccount = useStore((s) => s.setActiveAccount);

  // Нет сессии — на страницу входа.
  useEffect(() => {
    if (configured && !loading && !email) {
      router.replace("/login");
    }
  }, [configured, loading, email, router]);

  // Подгружаем данные аккаунта, соответствующего вошедшему пользователю.
  useEffect(() => {
    if (email && email !== currentEmail) {
      setActiveAccount(email);
    }
  }, [email, currentEmail, setActiveAccount]);

  // Если Supabase не настроен — не блокируем (запасной случай).
  if (!configured) {
    return <>{children}</>;
  }

  if (loading || !hydrated || !email) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-light" size={28} />
      </div>
    );
  }

  return <>{children}</>;
}
