import { NextResponse } from "next/server";

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
    .select("owner_id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing && existing.owner_id && existing.owner_id !== uid) {
    return NextResponse.json(
      { error: "Эта визитка принадлежит другому аккаунту" },
      { status: 403 }
    );
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

  return NextResponse.json({ ok: true });
}
