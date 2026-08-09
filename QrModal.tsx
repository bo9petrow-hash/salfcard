"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { CardVisual } from "@/components/CardVisual";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";

export default function PreviewPage() {
  const params = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const multilink = useStore((s) =>
    s.user.multilinks.find((m) => m.id === params.id)
  );
  const isBusiness = useStore((s) => s.user.tariff === "Бизнес");

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-sm">
        <div className="h-[560px] animate-pulse rounded-3xl border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (!multilink) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="text-sm text-slate-300">Визитка не найдена.</p>
        <Link
          href="/"
          className="mt-3 inline-block text-sm font-medium text-brand-light underline"
        >
          На главную
        </Link>
      </div>
    );
  }

  return (
    <CardVisual
      multilink={multilink}
      isBusiness={isBusiness}
      showEditLink
      editHref={`/multilink/${multilink.id}/edit`}
    />
  );
}
