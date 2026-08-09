"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Settings } from "lucide-react";

import { AuthGuard } from "@/components/AuthGuard";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsRedirect />
    </AuthGuard>
  );
}

function SettingsRedirect() {
  const hydrated = useHydrated();
  const multilinks = useStore((s) => s.user.multilinks);
  const router = useRouter();

  // Активной считаем последнюю созданную мультиссылку.
  const active = multilinks[multilinks.length - 1];

  useEffect(() => {
    if (hydrated && active) {
      router.replace(`/multilink/${active.id}/edit`);
    }
  }, [hydrated, active, router]);

  if (!hydrated || active) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-light" size={28} />
      </div>
    );
  }

  // Мультиссылок ещё нет.
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Настройки</h1>
        <p className="mt-1 text-sm text-slate-400">
          Редактирование активной мультиссылки-визитки.
        </p>
      </div>

      <SectionCard title="Нет активной визитки">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-brand-light">
            <Settings size={22} />
          </span>
          <p className="max-w-sm text-sm text-slate-300">
            Сначала создайте мультиссылку — после этого её настройки откроются
            здесь автоматически.
          </p>
          <Link href="/multilink/create">
            <Button>
              <Plus size={16} />
              Создать мультиссылку
            </Button>
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
