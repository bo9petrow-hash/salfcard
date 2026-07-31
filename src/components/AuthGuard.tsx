"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";

/** Обёртка для страниц, доступных только авторизованным пользователям. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  // Пока не восстановили состояние из localStorage или идёт редирект — заглушка.
  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-light" size={28} />
      </div>
    );
  }

  return <>{children}</>;
}
