import { createHash } from "crypto";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

import { CardVisual } from "@/components/CardVisual";
import { ViewCounter } from "@/components/ViewCounter";
import { normalizeSettings } from "@/lib/utils";
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

/**
 * Заголовок и превью ссылки: когда визитку пересылают в Telegram/WhatsApp,
 * показывается имя владельца, должность и логотип, а не общий «SELFCARDS».
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const row: any = await getCard(params.slug);
  if (!row) return { title: "Визитка не найдена — SELFCARDS", robots: { index: false } };
  try {
    const s = normalizeSettings(row.data ?? {});
    const isOffline = row.type === "offline";
    const name =
      (isOffline ? s.business?.name || s.name : s.name || s.contacts?.personal?.name) || row.slug;
    const sub = isOffline
      ? s.business?.address || ""
      : [s.contacts?.work?.position, s.contacts?.work?.company].filter(Boolean).join(" · ");
    const description = (sub || (s.contacts as any)?.about || "Электронная визитка SELFCARDS").slice(0, 160);
    const logo = imageUrl(row.slug, "logo", row.data?.logo);
    const url = `https://app.selfcards.ru/p/${row.slug}`;
    const images =
      typeof logo === "string" && logo
        ? [logo.startsWith("/") ? `https://app.selfcards.ru${logo}` : logo]
        : undefined;
    return {
      title: `${name} — визитка`,
      description,
      alternates: { canonical: url },
      openGraph: { title: name, description, url, siteName: "SELFCARDS", type: "profile", images },
      twitter: { card: "summary", title: name, description, images },
    };
  } catch {
    return { title: "Визитка — SELFCARDS" };
  }
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
