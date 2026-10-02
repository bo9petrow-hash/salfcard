import { randomUUID } from "crypto";

/**
 * Хелпер для работы с ЮKassa (YooKassa API v3).
 *
 * Ключи берутся ТОЛЬКО из переменных окружения на сервере — в код они не
 * попадают и в браузер не отдаются. Для теста используются тестовые shopId и
 * секретный ключ (их ЮKassa выдаёт сразу, без модерации). Когда магазин пройдёт
 * модерацию — в переменных окружения Timeweb меняются на боевые, код не трогаем.
 */
const SHOP_ID = process.env.YOOKASSA_SHOP_ID || "";
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || "";
const API = "https://api.yookassa.ru/v3";

export const isYookassaConfigured = Boolean(SHOP_ID && SECRET_KEY);

function authHeader(): string {
  const token = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString("base64");
  return `Basic ${token}`;
}

export interface CreatePaymentInput {
  value: string; // "1590.00"
  description: string;
  returnUrl: string;
  metadata?: Record<string, string>;
  receipt?: any;
}

/** Создать платёж. Возвращает ответ ЮKassa (в т.ч. confirmation.confirmation_url). */
export async function createPayment(input: CreatePaymentInput): Promise<any> {
  const body: any = {
    amount: { value: input.value, currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: input.returnUrl },
    description: input.description.slice(0, 128),
  };
  if (input.metadata) body.metadata = input.metadata;
  if (input.receipt) body.receipt = input.receipt;

  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Idempotence-Key": randomUUID(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `YooKassa create payment failed: ${res.status} ${JSON.stringify(json)}`
    );
  }
  return json;
}

/** Получить платёж по id (используется для проверки вебхука — доверяем только API). */
export async function getPayment(id: string): Promise<any> {
  const res = await fetch(`${API}/payments/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`YooKassa get payment failed: ${res.status}`);
  }
  return json;
}
