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

/**
 * Создаёт или обновляет карту (по slug) с привязкой к владельцу.
 *
 * Запись идёт через серверный роут /api/save-card (service_role в обход RLS):
 * прямой upsert из браузера под ключом authenticated не проходил из-за
 * отсутствующей политики UPDATE — Supabase возвращал 200, но строку не менял,
 * поэтому правки визитки не доходили до публичной ссылки на чипе.
 */
export async function saveCard(
  userId: string,
  card: { slug: string; type: MultilinkType; data: MultilinkSettings }
): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase || !userId) throw new Error("Supabase не настроен");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Сессия не найдена, войдите заново");

  const res = await fetch("/api/save-card", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      slug: card.slug,
      type: card.type,
      data: card.data,
    }),
  });

  if (!res.ok) {
    let message = "Не удалось сохранить визитку";
    try {
      const j = await res.json();
      if (j?.error) message = j.error;
    } catch {
      /* тело не JSON — оставляем общее сообщение */
    }
    throw new Error(message);
  }
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
