/**
 * Доставка СДЭК (API v2).
 *
 * Ключи — только на сервере, в переменных окружения Timeweb:
 *   CDEK_ACCOUNT, CDEK_SECURE      — ключи интеграции из личного кабинета СДЭК
 *   CDEK_FROM_CITY_CODE            — код города отправки (по умолчанию 46941 — Химки)
 *   CDEK_EXTRA                     — надбавка к цене доставки, ₽ (по умолчанию 0)
 *   CDEK_FREE_FROM                 — бесплатная доставка в ПВЗ от суммы товаров, ₽ (по умолчанию 4000; 0 — выкл.)
 *   CDEK_FREE_CAP                  — сколько максимум доплачиваем за клиента, ₽ (по умолчанию 800):
 *                                    если доставка дороже (дальние регионы), клиент платит только разницу
 *
 * Пока ключей нет, работает тестовый контур СДЭК (api.edu.cdek.ru) с публичными
 * тестовыми ключами из документации — магазин в этом режиме показывает доставку
 * только при ?cdektest=1, чтобы покупатели не видели тестовые цены.
 */
import type { CartLine } from "@/lib/products";

const TEST_ID = "wqGwiQx0gg8mLtiEKsUinjVSICCjtTEP";
const TEST_SECRET = "RmAmgvSgSl1yirlz9QupbzOJVqhCxcP5";

const ACCOUNT = process.env.CDEK_ACCOUNT || "";
const SECURE = process.env.CDEK_SECURE || "";

export const cdekMode: "prod" | "test" = ACCOUNT && SECURE ? "prod" : "test";
const BASE = cdekMode === "prod" ? "https://api.cdek.ru/v2" : "https://api.edu.cdek.ru/v2";
const FROM_CITY = Number(process.env.CDEK_FROM_CITY_CODE || 46941);
const EXTRA = Number(process.env.CDEK_EXTRA || 0);
export const FREE_FROM = Number(process.env.CDEK_FREE_FROM ?? 4000);
export const FREE_CAP = Number(process.env.CDEK_FREE_CAP ?? 800);

// Тарифы «Посылка» для интернет-магазина: склад-склад (до ПВЗ) и склад-дверь (курьер).
export const TARIFF_PVZ = 136;
export const TARIFF_DOOR = 137;

let token: { value: string; exp: number } | null = null;

async function getToken(): Promise<string> {
  if (token && Date.now() < token.exp) return token.value;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cdekMode === "prod" ? ACCOUNT : TEST_ID,
    client_secret: cdekMode === "prod" ? SECURE : TEST_SECRET,
  });
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) throw new Error("СДЭК: не удалось авторизоваться");
  token = { value: data.access_token, exp: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000 };
  return token.value;
}

async function api(path: string, init: RequestInit = {}): Promise<any> {
  const t = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.errors?.[0]?.message || data?.requests?.[0]?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`СДЭК: ${msg}`);
  }
  return data;
}

/** Подсказки городов по началу названия. */
export async function suggestCities(q: string) {
  const name = q.trim().slice(0, 60);
  if (name.length < 2) return [];
  const data = await api(`/location/suggest/cities?name=${encodeURIComponent(name)}&country_code=RU`);
  return (Array.isArray(data) ? data : []).slice(0, 10).map((c: any) => ({
    code: Number(c.code),
    name: String(c.full_name || c.city || ""),
  }));
}

export interface Point {
  code: string;
  name: string;
  address: string;
  work_time: string;
  lat: number;
  lon: number;
}

const pointsCache = new Map<number, { at: number; list: Point[] }>();

/** Пункты выдачи СДЭК в городе (кеш 6 часов). */
export async function getPoints(cityCode: number): Promise<Point[]> {
  const hit = pointsCache.get(cityCode);
  if (hit && Date.now() - hit.at < 6 * 3600 * 1000) return hit.list;
  const data = await api(`/deliverypoints?city_code=${cityCode}&type=PVZ&is_handout=true`);
  const list: Point[] = (Array.isArray(data) ? data : []).map((p: any) => ({
    code: String(p.code),
    name: String(p.name || ""),
    address: String(p.location?.address || p.location?.address_full || ""),
    work_time: String(p.work_time || ""),
    lat: Number(p.location?.latitude || 0),
    lon: Number(p.location?.longitude || 0),
  }));
  list.sort((a, b) => a.address.localeCompare(b.address, "ru"));
  pointsCache.set(cityCode, { at: Date.now(), list });
  return list;
}

// Упаковка товаров: вес (г) и размеры коробки (см). Подправьте под реальные.
export const PACK: Record<string, { w: number; l: number; wd: number; h: number }> = {
  card: { w: 100, l: 15, wd: 10, h: 2 },
  tent: { w: 600, l: 25, wd: 20, h: 8 },
};

/** Одна посылка на весь заказ: вес — сумма, размеры — по самой большой коробке, высота — стопкой. */
export function packageFor(lines: CartLine[]) {
  let weight = 0, length = 10, width = 10, height = 0;
  for (const l of lines) {
    const p = PACK[l.product.sku.startsWith("tent") ? "tent" : "card"];
    weight += p.w * l.qty;
    length = Math.max(length, p.l);
    width = Math.max(width, p.wd);
    height += p.h * l.qty;
  }
  return { weight: Math.max(weight, 50), length, width, height: Math.min(Math.max(height, 2), 60) };
}

export interface Quote {
  price: number;
  full_price: number;
  discount: number;
  period_min: number;
  period_max: number;
  tariff: number;
}

/** Расчёт стоимости доставки (с надбавкой и порогом бесплатной доставки). */
export async function quote(opts: {
  cityCode: number;
  mode: "pvz" | "door";
  address?: string;
  lines: CartLine[];
  goodsTotal: number;
}): Promise<Quote> {
  const tariff = opts.mode === "door" ? TARIFF_DOOR : TARIFF_PVZ;
  const to: any = { code: opts.cityCode };
  if (opts.mode === "door" && opts.address) to.address = opts.address.slice(0, 255);
  const data = await api(`/calculator/tariff`, {
    method: "POST",
    body: JSON.stringify({
      type: 1,
      currency: 1,
      tariff_code: tariff,
      from_location: { code: FROM_CITY },
      to_location: to,
      packages: [packageFor(opts.lines)],
    }),
  });
  const raw = Number(data?.total_sum ?? data?.delivery_sum);
  if (!Number.isFinite(raw) || raw <= 0) throw new Error("СДЭК не смог рассчитать доставку в этот город");
  const full = Math.ceil((raw + EXTRA) / 10) * 10;
  // Бесплатная доставка в ПВЗ от FREE_FROM: оплачиваем за клиента до FREE_CAP ₽.
  let discount = 0;
  if (opts.mode === "pvz" && FREE_FROM > 0 && opts.goodsTotal >= FREE_FROM) {
    discount = Math.min(full, FREE_CAP);
  }
  return {
    price: full - discount,
    full_price: full,
    discount,
    period_min: Number(data?.period_min || 0),
    period_max: Number(data?.period_max || 0),
    tariff,
  };
}

/* ------------------------------------------------------------------ */
/*  Автоматическое оформление отправления после оплаты                 */
/* ------------------------------------------------------------------ */
//   CDEK_SHIPMENT_POINT — код ПВЗ, куда вы сдаёте посылки (например, «KHM12»).
//                         Пока не задан — отправления не создаются, оформляете вручную.
//   CDEK_SENDER_PHONE   — телефон отправителя (по умолчанию +79264921123)
export const SHIPMENT_POINT = process.env.CDEK_SHIPMENT_POINT || "";
const SENDER_PHONE = process.env.CDEK_SENDER_PHONE || "+79264921123";
const SENDER_NAME = process.env.CDEK_SENDER_NAME || "Петров Богдан Васильевич";
const SENDER_COMPANY = "ИП Петров Богдан Васильевич";

function normPhone(p: string): string {
  let d = String(p || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);
  if (d.length === 10) d = "7" + d;
  return d ? "+" + d : "";
}

export interface ShipmentInput {
  orderNumber: string;
  mode: "pvz" | "door";
  cityCode: number;
  pvzCode?: string;
  address?: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  lines: CartLine[];
}

/** Создаёт заказ в СДЭК. Возвращает uuid и (если успел присвоиться) номер для отслеживания. */
export async function createShipment(inp: ShipmentInput): Promise<{ uuid: string; number: string | null }> {
  if (!SHIPMENT_POINT) throw new Error("не задан CDEK_SHIPMENT_POINT (пункт сдачи посылок)");
  const phone = normPhone(inp.recipientPhone);
  if (!phone) throw new Error("у клиента нет телефона");
  const pkg = packageFor(inp.lines);
  const body: any = {
    type: 1,
    number: inp.orderNumber,
    tariff_code: inp.mode === "door" ? TARIFF_DOOR : TARIFF_PVZ,
    shipment_point: SHIPMENT_POINT,
    sender: { company: SENDER_COMPANY, name: SENDER_NAME, phones: [{ number: normPhone(SENDER_PHONE) }] },
    recipient: {
      name: (inp.recipientName || "Покупатель").slice(0, 255),
      phones: [{ number: phone }],
      ...(inp.recipientEmail ? { email: inp.recipientEmail } : {}),
    },
    packages: [
      {
        number: "1",
        ...pkg,
        items: inp.lines.map((l) => ({
          name: l.product.title.slice(0, 255),
          ware_key: l.product.sku,
          payment: { value: 0 }, // уже оплачено онлайн
          cost: l.product.price,
          weight: PACK[l.product.sku.startsWith("tent") ? "tent" : "card"].w,
          amount: l.qty,
        })),
      },
    ],
  };
  if (inp.mode === "pvz") body.delivery_point = String(inp.pvzCode || "");
  else body.to_location = { code: inp.cityCode, address: String(inp.address || "").slice(0, 255) };

  const res = await api(`/orders`, { method: "POST", body: JSON.stringify(body) });
  const uuid: string = res?.entity?.uuid;
  if (!uuid) throw new Error("СДЭК не вернул номер заказа");

  // Номер для отслеживания присваивается за пару секунд — подождём немного.
  let invalid = "";
  for (const delay of [1200, 1800]) {
    await new Promise((r) => setTimeout(r, delay));
    try {
      const o = await api(`/orders/${uuid}`);
      const errs = (o?.requests || []).flatMap((r: any) => (r?.state === "INVALID" ? r.errors || [] : []));
      if (errs.length) {
        invalid = errs.map((e: any) => e.message).join("; ");
        break;
      }
      const num = o?.entity?.cdek_number;
      if (num) return { uuid, number: String(num) };
    } catch {
      /* временная ошибка — номер можно будет посмотреть в кабинете СДЭК */
    }
  }
  if (invalid) throw new Error(invalid);
  return { uuid, number: null };
}
