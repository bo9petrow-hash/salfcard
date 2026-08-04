import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST /api/publish
 * Тело: { slug, type, data }
 * Сохраняет (создаёт или обновляет по slug) визитку в таблице cards.
 * Запись выполняется на сервере секретным ключом — из браузера писать нельзя.
 */
export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "База данных не настроена." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Некорректные данные." },
      { status: 400 }
    );
  }

  const slug = String(body?.slug || "").trim();
  const type = body?.type === "offline" ? "offline" : "self";
  const data = body?.data ?? {};

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Пустой адрес визитки (slug)." },
      { status: 400 }
    );
  }

  const { error } = await admin.from("cards").upsert(
    {
      slug,
      type,
      data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, slug });
}
