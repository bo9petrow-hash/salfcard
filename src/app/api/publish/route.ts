import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/publish — ОТКЛЮЧЁН.
 *
 * Раньше роут записывал визитку в базу секретным ключом без проверки входа:
 * любой мог создать или перезаписать чужую визитку по её адресу. Кабинет
 * сохраняет визитки через /api/save-card (с проверкой владельца), поэтому
 * этот роут больше не нужен.
 */
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Метод отключён. Используйте /api/save-card." },
    { status: 410 }
  );
}
