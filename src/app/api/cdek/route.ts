import { NextResponse } from "next/server";

import { parseCart } from "@/lib/products";
import { cdekMode, FREE_FROM, getPoints, quote, suggestCities } from "@/lib/cdek";

export const dynamic = "force-dynamic";

/**
 * API доставки СДЭК для магазина shop.selfcards.ru.
 *   GET  ?action=info                    → { mode, free_from }
 *   GET  ?action=cities&q=Моск           → [{ code, name }]
 *   GET  ?action=points&city=44          → [{ code, name, address, work_time, lat, lon }]
 *   POST { action:"calc", city_code, mode:"pvz"|"door", address?, items:[{sku,qty}] }
 *                                        → { price, period_min, period_max }
 */
const ALLOWED_ORIGINS = new Set([
  "https://shop.selfcards.ru",
  "https://selfcards.ru",
  "https://www.selfcards.ru",
]);

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://shop.selfcards.ru",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

export async function GET(req: Request) {
  const h = cors(req.headers.get("origin"));
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  try {
    if (action === "info") {
      return NextResponse.json({ mode: cdekMode, free_from: FREE_FROM }, { headers: h });
    }
    if (action === "cities") {
      const list = await suggestCities(url.searchParams.get("q") || "");
      return NextResponse.json(list, { headers: { ...h, "Cache-Control": "public, max-age=3600" } });
    }
    if (action === "points") {
      const city = Number(url.searchParams.get("city"));
      if (!Number.isFinite(city) || city <= 0) {
        return NextResponse.json({ error: "Не указан город" }, { status: 400, headers: h });
      }
      const list = await getPoints(city);
      return NextResponse.json(list, { headers: { ...h, "Cache-Control": "public, max-age=3600" } });
    }
    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400, headers: h });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Ошибка СДЭК" }, { status: 502, headers: h });
  }
}

export async function POST(req: Request) {
  const h = cors(req.headers.get("origin"));
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400, headers: h });
  }
  if (body?.action !== "calc") {
    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400, headers: h });
  }
  try {
    const cart = parseCart(body?.items);
    const cityCode = Number(body?.city_code);
    if (!Number.isFinite(cityCode) || cityCode <= 0) throw new Error("Выберите город");
    const mode = body?.mode === "door" ? "door" : "pvz";
    const q = await quote({
      cityCode,
      mode,
      address: String(body?.address || ""),
      lines: cart.lines,
      goodsTotal: cart.total,
    });
    return NextResponse.json(q, { headers: h });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Ошибка расчёта" }, { status: 400, headers: h });
  }
}
