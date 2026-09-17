import { CardVisual } from "@/components/CardVisual";
import { ViewCounter } from "@/components/ViewCounter";
import { getSupabaseAdmin, getSupabasePublic } from "@/lib/supabase";
import type { Multilink } from "@/types";

// Всегда свежие данные (визитку могли только что обновить).
export const dynamic = "force-dynamic";

export default async function PublicCardPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  // Читаем визитку серверным ключом в обход RLS, чтобы публичная
  // страница показывала данные любой карты (у гостя нет доступа к data).
  const supabase = getSupabaseAdmin() ?? getSupabasePublic();

  let row: any = null;
  if (supabase) {
    const { data } = await supabase
      .from("cards")
      .select("slug, type, data")
      .eq("slug", slug)
      .maybeSingle();
    row = data;
  }

  if (!row) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <h1 className="text-lg font-semibold text-white">Визитка не найдена</h1>
        <p className="mt-2 text-sm text-slate-400">
          Возможно, ссылка неверна или визитка ещё не опубликована.
        </p>
      </div>
    );
  }

  const data = row.data ?? {};
  const multilink: Multilink = {
    id: row.slug,
    title: data?.name || data?.business?.name || row.slug,
    slug: row.slug,
    language: "",
    type: row.type === "offline" ? "offline" : "self",
    settings: data,
  };

  return (
    <div className="py-2">
      <ViewCounter slug={row.slug} />
      <CardVisual multilink={multilink} isBusiness />
    </div>
  );
}
