import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Картинки визитки (логотип и фон) отдельными файлами.
 *
 * Раньше логотип и фон хранились внутри визитки как base64-текст и вшивались
 * прямо в HTML страницы /p/[slug] (дважды) — страница весила ~500 КБ и не
 * кешировалась. Теперь страница ссылается сюда: /i/<slug>/logo?v=<хеш>.
 * Ответ кешируется браузером «навсегда» (immutable): при смене картинки меняется
 * хеш в адресе, поэтому устаревшая версия показана не будет.
 */

export const runtime = "nodejs";

const ALLOWED_FIELDS = new Set(["logo", "background"]);

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function readCardData(slug: string): Promise<any | null> {
  if (!URL || !KEY) return null;
  // Тот же кеш, что у страницы визитки (тег card-<slug>), — без лишних походов в базу.
  const cachedFetch: typeof fetch = (input: any, init?: any) =>
    fetch(input, { ...(init || {}), next: { revalidate: 3600, tags: [`card-${slug}`] } } as any);
  const supabase = createClient(URL, KEY, {
    auth: { persistSession: false },
    global: { fetch: cachedFetch },
  });
  const { data } = await supabase
    .from("cards")
    .select("data")
    .eq("slug", slug)
    .maybeSingle();
  return data?.data ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; field: string } }
) {
  const { slug, field } = params;
  if (!slug || !ALLOWED_FIELDS.has(field)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = await readCardData(slug);
  const value: unknown = data?.[field];
  if (typeof value !== "string" || !value) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Если в визитке уже обычная ссылка на картинку — просто перенаправляем.
  if (/^https?:\/\//i.test(value)) {
    return NextResponse.redirect(value, 302);
  }

  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(value);
  if (!m) {
    return new NextResponse("Not found", { status: 404 });
  }
  const mime = m[1] || "application/octet-stream";
  const isB64 = Boolean(m[2]);
  const payload = m[3];
  const buf = isB64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
