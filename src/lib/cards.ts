import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { Multilink, MultilinkSettings, MultilinkType } from "@/types";

interface CardRow {
  slug: string;
  type: string;
  data: any;
  views?: number;
}

/** Преобразует строку из базы в объект мультиссылки для приложения. */
export function rowToMultilink(row: CardRow): Multilink {
  const data = row.data ?? {};
  return {
    id: row.slug,
    title: data?.name || data?.business?.name || row.slug,
    slug: row.slug,
    language: "",
    type: (row.type === "offline" ? "offline" : "self") as MultilinkType,
    settings: data as MultilinkSettings,
    views: typeof row.views === "number" ? row.views : 0,
  };
}

/** Загружает карты текущего владельца. */
export async function fetchMyCards(userId: string): Promise<Multilink[]> {
  const supabase = getSupabaseBrowser();
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("cards")
    .select("slug, type, data, views")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToMultilink);
}

/** Создаёт или обновляет карту (по slug) с привязкой к владельцу. */
export async function saveCard(
  userId: string,
  card: { slug: string; type: MultilinkType; data: MultilinkSettings }
): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase || !userId) throw new Error("Supabase не настроен");
  const { error } = await supabase.from("cards").upsert(
    {
      slug: card.slug,
      type: card.type,
      data: card.data,
      owner_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );
  if (error) throw error;
}

/** Проверяет, занят ли slug (адрес визитки) в базе. */
export async function isSlugTaken(slug: string): Promise<boolean> {
  const supabase = getSupabaseBrowser();
  if (!supabase || !slug) return false;
  const { data, error } = await supabase
    .from("cards")
    .select("slug")
    .eq("slug", slug)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Удаляет карту по slug (база разрешает только владельцу). */
export async function deleteCard(slug: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Supabase не настроен");
  const { error } = await supabase.from("cards").delete().eq("slug", slug);
  if (error) throw error;
}

/** Засчитывает открытие визитки (+1 к счётчику просмотров). */
export async function incrementCardViews(slug: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  await supabase.rpc("increment_card_views", { card_slug: slug });
}
