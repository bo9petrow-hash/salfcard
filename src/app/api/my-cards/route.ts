import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Карты владельца для кабинета — БЕЗ тяжёлых картинок.
 *
 * Логотип и фон хранятся в cards.data как base64 (сотни КБ). Раньше кабинет
 * тянул их целиком при каждом входе (~400 КБ, 2–6 с). Теперь вместо base64
 * отдаём короткие ссылки /i/<slug>/<поле>?v=<хэш> — картинки грузятся отдельно
 * и кешируются браузером. При сохранении /api/save-card подставляет обратно
 * исходную картинку, если ссылка не менялась.
 */
function shrink(slug: string, field: "logo" | "background", value: unknown) {
  if (typeof value !== "string" || !value.startsWith("data:")) return value;
  const v = createHash("sha1").update(value).digest("hex").slice(0, 12);
  return `/i/${encodeURIComponent(slug)}/${field}?v=${v}`;
}

export async function GET(req: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Сервер не настроен" }, { status: 500 });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Сессия недействительна" }, { status: 401 });
  }

  const { data, error } = await admin
    .from("cards")
    .select("slug, type, data, views")
    .eq("owner_id", userData.user.id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((r: any) => {
    const d = r.data ?? {};
    return {
      slug: r.slug,
      type: r.type,
      views: r.views,
      data: { ...d, logo: shrink(r.slug, "logo", d.logo), background: shrink(r.slug, "background", d.background) },
    };
  });
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}
