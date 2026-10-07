import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase";

// Всегда серверный запрос, без кэширования.
export const dynamic = "force-dynamic";

/**
 * Сохранение визитки через серверный (service_role) ключ.
 *
 * Раньше запись шла напрямую из браузера под ключом authenticated и молча
 * не проходила (у таблицы cards нет политики UPDATE в RLS — upsert возвращал
 * 200, но строку не менял). Теперь клиент присылает свой access-токен, сервер
 * проверяет пользователя и пишет карту service-ключом в обход RLS, при этом
 * владелец подставляется из проверенного токена — чужую карту изменить нельзя.
 */
export async function POST(req: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Сервер не настроен (нет ключа записи)" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // Проверяем токен и получаем id пользователя.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Сессия недействительна, войдите заново" }, { status: 401 });
  }
  const uid = userData.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const type = body?.type === "offline" ? "offline" : "self";
  const data = body?.data ?? {};
  if (!slug) {
    return NextResponse.json({ error: "Не указан адрес визитки" }, { status: 400 });
  }

  // Если карта уже существует — она должна принадлежать этому пользователю.
  const { data: existing } = await admin
    .from("cards")
    .select("owner_id, data")
    .eq("slug", slug)
    .maybeSingle();
  if (existing && existing.owner_id && existing.owner_id !== uid) {
    return NextResponse.json(
      { error: "Эта визитка принадлежит другому аккаунту" },
      { status: 403 }
    );
  }

  // Кабинет получает логотип и фон ссылками /i/... (без base64, см. /api/my-cards).
  // Если картинку не меняли — пришла та же ссылка: возвращаем исходное значение из базы.
  for (const field of ["logo", "background"] as const) {
    const v = (data as any)?.[field];
    if (typeof v === "string" && v.startsWith("/i/")) {
      (data as any)[field] = (existing as any)?.data?.[field] ?? undefined;
    }
  }

  const { error } = await admin.from("cards").upsert(
    {
      slug,
      type,
      data,
      owner_id: uid,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Сбрасываем кеш публичной страницы визитки — изменения видны сразу.
  try { revalidateTag(`card-${slug}`); } catch { /* не критично */ }

  return NextResponse.json({ ok: true });
}
