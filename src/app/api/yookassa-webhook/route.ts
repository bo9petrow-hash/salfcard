import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { getPayment } from "@/lib/yookassa";
import { parseCart } from "@/lib/products";
import { createShipment, SHIPMENT_POINT } from "@/lib/cdek";

export const dynamic = "force-dynamic";

/**
 * Вебхук ЮKassa.
 *
 * ЮKassa присылает уведомление (например, payment.succeeded). Мы НЕ доверяем телу
 * уведомления напрямую (его можно подделать) — берём id платежа и перепроверяем
 * статус через API ЮKassa нашим секретным ключом. Только если API подтвердил
 * «succeeded» — помечаем заказ оплаченным.
 *
 * Адрес этого вебхука нужно указать в кабинете ЮKassa:
 *   https://app.selfcards.ru/api/yookassa-webhook
 */
export async function POST(req: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 200 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const paymentId = body?.object?.id;
  if (!paymentId) return NextResponse.json({ ok: true }, { status: 200 });

  // Перепроверяем платёж через API ЮKassa.
  let payment: any;
  try {
    payment = await getPayment(String(paymentId));
  } catch {
    // Временная ошибка — пусть ЮKassa повторит уведомление позже.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const status = payment?.status;
  const orderId = payment?.metadata?.order_id;

  const newStatus =
    status === "succeeded" ? "paid" : status === "canceled" ? "canceled" : "pending";

  const patch: any = { status: newStatus };
  if (newStatus === "paid") patch.paid_at = new Date().toISOString();

  // Автоматически оформляем отправление СДЭК (только при первом переходе в «оплачен»).
  // Результат дописываем в комментарий заказа — он попадёт в уведомление в Telegram.
  const m = payment?.metadata || {};
  if (newStatus === "paid" && orderId && m.dlv_city) {
    try {
      const { data: ord } = await admin
        .from("orders")
        .select("status, name, phone, email, comment")
        .eq("id", orderId)
        .maybeSingle();
      if (ord && ord.status !== "paid") {
        let note = "";
        if (!SHIPMENT_POINT) {
          note = "📦 СДЭК: оформите отправление вручную (автооформление выключено).";
        } else {
          try {
            const items = String(m.dlv_items || "")
              .split(";")
              .filter(Boolean)
              .map((x: string) => ({ sku: x.split(":")[0], qty: Number(x.split(":")[1] || 1) }));
            const cart = parseCart(items);
            const r = await createShipment({
              orderNumber: String(orderId).slice(0, 32),
              mode: m.dlv_mode === "door" ? "door" : "pvz",
              cityCode: Number(m.dlv_city),
              pvzCode: m.dlv_pvz,
              address: m.dlv_addr,
              recipientName: ord.name || "",
              recipientPhone: ord.phone || "",
              recipientEmail: ord.email || "",
              lines: cart.lines,
            });
            note = r.number
              ? `📦 СДЭК: отправление оформлено, трек-номер ${r.number}. Отнесите посылку в пункт сдачи.`
              : `📦 СДЭК: отправление оформлено (номер появится в кабинете СДЭК через минуту). Отнесите посылку в пункт сдачи.`;
          } catch (e: any) {
            note = `📦 СДЭК: не удалось оформить автоматически — оформите вручную. Причина: ${String(e?.message || e).slice(0, 200)}`;
          }
        }
        patch.comment = (ord.comment ? ord.comment + "\n\n" : "") + note;
      }
    } catch {
      /* не мешаем отметке об оплате */
    }
  }

  // Обновляем заказ по order_id из metadata (надёжнее) или по id платежа.
  let q = admin.from("orders").update(patch);
  if (orderId) q = q.eq("id", orderId);
  else q = q.eq("yk_payment_id", String(paymentId));
  await q;

  return NextResponse.json({ ok: true }, { status: 200 });
}
