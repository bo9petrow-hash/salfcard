import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { parseCart } from "@/lib/products";
import { createPayment, isYookassaConfigured } from "@/lib/yookassa";
import { getPoints, quote } from "@/lib/cdek";

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

// Форматирование суммы без зависимости от локали: "1 590 ₽".
function money(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
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

  // 1. Считаем сумму заказа на сервере по доверенному каталогу (анти-подмена цены).
  let cart;
  try {
    cart = parseCart(body?.items);
  } catch (e: any) {
    return json({ error: e?.message || "Ошибка корзины" }, 400);
  }

  // 2. Данные покупателя и доставки.
  const name = String(body?.customer?.name || "").trim().slice(0, 120);
  const phone = String(body?.customer?.phone || "").trim().slice(0, 32);
  const email = String(body?.customer?.email || "").trim().slice(0, 120);
  let city = String(body?.customer?.city || "").trim().slice(0, 120);
  let address = String(body?.customer?.address || "").trim().slice(0, 300);
  const userComment = String(body?.customer?.comment || "").trim().slice(0, 500);
  if (!phone && !email) {
    return json({ error: "Укажите телефон или email для связи" }, 400);
  }

  // 2б. Доставка СДЭК: цену и адрес пункта считаем/проверяем на сервере.
  let delivery: null | { price: number; text: string; period: string; meta: Record<string, string> } = null;
  if (body?.delivery && body.delivery.city_code) {
    try {
      const d = body.delivery;
      const cityCode = Number(d.city_code);
      const mode = d.mode === "door" ? "door" : "pvz";
      const cityName = String(d.city_name || "").trim().slice(0, 120);
      let text = "";
      if (mode === "pvz") {
        const pts = await getPoints(cityCode);
        const pt = pts.find((p) => p.code === String(d.pvz_code || ""));
        if (!pt) return json({ error: "Выберите пункт выдачи СДЭК" }, 400);
        text = `СДЭК ПВЗ ${pt.code}: ${pt.address}`;
      } else {
        const addr = String(d.address || "").trim().slice(0, 255);
        if (addr.length < 5) return json({ error: "Укажите адрес для курьера" }, 400);
        text = `Курьер СДЭК: ${addr}`;
      }
      const q = await quote({ cityCode, mode, address: d.address, lines: cart.lines, goodsTotal: cart.total });
      const period = q.period_min ? `${q.period_min}–${q.period_max} дн.` : "";
      delivery = {
        price: q.price,
        text,
        period,
        // Для автоматического оформления отправления СДЭК после оплаты (см. вебхук).
        meta: {
          dlv_mode: mode,
          dlv_city: String(cityCode),
          dlv_pvz: mode === "pvz" ? String(d.pvz_code || "") : "",
          dlv_addr: mode === "door" ? String(d.address || "").slice(0, 400) : "",
          dlv_items: cart.lines.map((l) => `${l.product.sku}:${l.qty}`).join(";").slice(0, 500),
        },
      };
      if (cityName) city = cityName;
      address = text;
    } catch (e: any) {
      return json({ error: e?.message || "Не удалось рассчитать доставку" }, 400);
    }
  }
  const deliveryPrice = delivery?.price || 0;
  const grandTotal = cart.total + deliveryPrice;

  const value = grandTotal.toFixed(2);
  const totalQty = cart.lines.reduce((s, l) => s + l.qty, 0);

  // Позиции для чека (54-ФЗ) и для карточки заказа.
  const itemsJson = cart.lines.map((l) => ({
    sku: l.product.sku,
    title: l.product.title,
    price: l.product.price,
    qty: l.qty,
  }));

  // Текстовое описание заказа — попадает в те же поля, что читает Telegram-уведомление.
  const breakdown = cart.lines
    .map((l) => `${l.qty}×${l.product.title} — ${money(l.product.price)} (${money(l.product.price * l.qty)})`)
    .join("\n");
  const productSummary =
    cart.lines.map((l) => `${l.qty}×${l.product.title}`).join(", ") +
    (delivery ? ` + доставка ${money(deliveryPrice)}` : "") +
    " — итого " + money(grandTotal);
  const commentFull =
    "🛒 Состав заказа:\n" + breakdown +
    "\nТовары: " + money(cart.total) + " (" + totalQty + " шт.)" +
    (delivery
      ? "\n🚚 Доставка: " + delivery.text + " — " + (deliveryPrice ? money(deliveryPrice) : "бесплатно") +
        (delivery.period ? " (срок " + delivery.period + ")" : "")
      : "") +
    "\nИтого к оплате: " + money(grandTotal) +
    (userComment ? "\n\nКомментарий клиента: " + userComment : "") +
    "\n\n✅ ОПЛАЧЕНО ОНЛАЙН (ЮKassa)";

  // 3. Создаём заказ в статусе pending. Пишем в «старые» колонки (name/phone/...),
  //    чтобы Telegram-уведомление пришло полным, когда заказ станет оплаченным.
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      name: name || null,
      phone: phone || null,
      email: email || null,
      product: productSummary,
      quantity: totalQty,
      city: city || null,
      address: address || null,
      comment: commentFull,
      amount: grandTotal,
      currency: "RUB",
      status: "pending",
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    return json({ error: "Не удалось создать заказ" }, 500);
  }

  // 4. Чек для 54-ФЗ. Значения налогов — из env (по умолчанию УСН «доход» = 2, без НДС = 1).
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
  if (deliveryPrice > 0) {
    receipt.items.push({
      description: "Доставка СДЭК",
      quantity: "1.00",
      amount: { value: deliveryPrice.toFixed(2), currency: "RUB" },
      vat_code: vatCode,
      payment_subject: "service",
      payment_mode: "full_payment",
    });
  }
  if (email) receipt.customer.email = email;
  if (phone) receipt.customer.phone = phone;

  const returnUrl =
    process.env.YOOKASSA_RETURN_URL || "https://shop.selfcards.ru/?paid=1";

  // 5. Создаём платёж в ЮKassa.
  let payment: any;
  try {
    payment = await createPayment({
      value,
      description: `Заказ SELFCARDS №${String(order.id).slice(0, 8)}`,
      returnUrl: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}order=${order.id}`,
      metadata: { order_id: String(order.id), ...(delivery ? delivery.meta : {}) },
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
