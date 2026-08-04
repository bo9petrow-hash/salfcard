import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { Multilink, MultilinkSettings, MultilinkType } from "@/types";

interface CardRow {
  slug: string;
  type: string;
  data: any;
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
  };
}

/** Загружает карты текущего владельца. */
export async function fetchMyCards(userId: string): Promise<Multilink[]> {
  const supabase = getSupabaseBrowser();
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("cards")
    .select("slug, type, data")
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

/** Удаляет карту по slug (база разрешает только владельцу). */
export async function deleteCard(slug: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Supabase не настроен");
  const { error } = await supabase.from("cards").delete().eq("slug", slug);
  if (error) throw error;
}
