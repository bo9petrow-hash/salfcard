import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { parseCart } from "@/lib/products";
import { createPayment, isYookassaConfigured } from "@/lib/yookassa";

export const dynamic = "force-dynamic";

// Магазин — отдельный поддомен, поэтому запросы кросс-доменные: разрешаем CORS.
const ALLOWED_ORIGINS = new Set([
  "https://shop.selfcards.ru",
  "https://selfcards.ru",
  "https://www.selfcards.ru",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://shop.selfcards.ru";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const json = (data: any, status = 200) =>
    NextResponse.json(data, { status, headers: cors });

  if (!isYookassaConfigured) {
    return json({ error: "Оплата временно недоступна (не настроены ключи)" }, 503);
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return json({ error: "Сервер не настроен" }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Некорректный запрос" }, 400);
  }

  // 1. Считаем сумму заказа на сервере по доверенному каталогу.
  let cart;
  try {
    cart = parseCart(body?.items);
  } catch (e: any) {
    return json({ error: e?.message || "Ошибка корзины" }, 400);
  }

  const name = String(body?.customer?.name || "").trim().slice(0, 120);
  const phone = String(body?.customer?.phone || "").trim().slice(0, 32);
  const email = String(body?.customer?.email || "").trim().slice(0, 120);
  if (!phone && !email) {
    return json({ error: "Укажите телефон или email для связи" }, 400);
  }

  const value = cart.total.toFixed(2);
  const itemsJson = cart.lines.map((l) => ({
    sku: l.product.sku,
    title: l.product.title,
    price: l.product.price,
    qty: l.qty,
  }));

  // 2. Создаём заказ в статусе pending.
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      items: itemsJson,
      amount: cart.total,
      currency: "RUB",
      customer_name: name || null,
      customer_phone: phone || null,
      customer_email: email || null,
      status: "pending",
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    return json({ error: "Не удалось создать заказ" }, 500);
  }

  // 3. Чек для 54-ФЗ (ЮKassa сама фискализирует). Значения налогов — из env,
  //    по умолчанию УСН «доход» (2) и без НДС (1); при необходимости поменяешь.
  const vatCode = Number(process.env.YOOKASSA_VAT_CODE || 1);
  const taxSystemCode = Number(process.env.YOOKASSA_TAX_SYSTEM_CODE || 2);
  const receipt: any = {
    customer: {} as any,
    tax_system_code: taxSystemCode,
    items: cart.lines.map((l) => ({
      description: l.product.title.slice(0, 128),
      quantity: l.qty.toFixed(2),
      amount: { value: l.product.price.toFixed(2), currency: "RUB" },
      vat_code: vatCode,
      payment_subject: "commodity",
      payment_mode: "full_payment",
    })),
  };
  if (email) receipt.customer.email = email;
  if (phone) receipt.customer.phone = phone;

  const returnUrl =
    process.env.YOOKASSA_RETURN_URL || "https://shop.selfcards.ru/?paid=1";

  // 4. Создаём платёж в ЮKassa.
  let payment: any;
  try {
    payment = await createPayment({
      value,
      description: `Заказ SELFCARDS №${String(order.id).slice(0, 8)}`,
      returnUrl: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}order=${order.id}`,
      metadata: { order_id: String(order.id) },
      receipt,
    });
  } catch (e: any) {
    await admin.from("orders").update({ status: "error" }).eq("id", order.id);
    return json({ error: "Не удалось создать платёж. Попробуйте позже." }, 502);
  }

  const confirmationUrl = payment?.confirmation?.confirmation_url;
  await admin
    .from("orders")
    .update({ yk_payment_id: payment?.id || null })
    .eq("id", order.id);

  if (!confirmationUrl) {
    return json({ error: "Платёж создан, но нет ссылки на оплату" }, 502);
  }

  return json({ ok: true, order_id: order.id, confirmation_url: confirmationUrl });
}
