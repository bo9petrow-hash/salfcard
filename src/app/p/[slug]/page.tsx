import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

import { CardVisual } from "@/components/CardVisual";
import { ViewCounter } from "@/components/ViewCounter";
import type { Multilink } from "@/types";

/**
 * Публичная визитка — то, что открывается при касании NFC-карты.
 *
 * Скорость:
 *  - страница кешируется на сервере (ISR) и не ходит в базу при каждом касании;
 *    после сохранения визитки кеш сбрасывается сразу (revalidateTag в
 *    /api/save-card и /api/publish), так что изменения видны мгновенно;
 *  - логотип и фон больше не вшиваются в HTML как base64 (это раздувало
 *    страницу до ~500 КБ), а отдаются отдельными кешируемыми файлами /i/....
 * Всё идёт через собственный домен app.selfcards.ru — работает и без VPN.
 */
export const revalidate = 3600;
// Визитки не собираем заранее: каждая рендерится при первом открытии и
// дальше отдаётся из кеша (пустой список включает кеширование целой страницы).
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Серверный ключ: публичная страница должна видеть данные любой карты.
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getCard(slug: string) {
  if (!URL || !KEY) return null;
  const cachedFetch: typeof fetch = (input: any, init?: any) =>
    fetch(input, { ...(init || {}), next: { revalidate: 3600, tags: [`card-${slug}`] } } as any);
  const supabase = createClient(URL, KEY, {
    auth: { persistSession: false },
    global: { fetch: cachedFetch },
  });
  const { data } = await supabase
    .from("cards")
    .select("slug, type, data")
    .eq("slug", slug)
    .maybeSingle();
  return data ?? null;
}

/** Заменяет base64-картинку ссылкой на отдельный кешируемый файл. */
function imageUrl(slug: string, field: "logo" | "background", value: unknown) {
  if (typeof value !== "string" || !value) return value;
  if (!value.startsWith("data:")) return value; // уже обычная ссылка
  const v = createHash("sha1").update(value).digest("hex").slice(0, 12);
  return `/i/${encodeURIComponent(slug)}/${field}?v=${v}`;
}

export default async function PublicCardPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  const row: any = await getCard(slug);

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

  const raw = row.data ?? {};
  const data = {
    ...raw,
    logo: imageUrl(row.slug, "logo", raw.logo),
    background: imageUrl(row.slug, "background", raw.background),
  };

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
