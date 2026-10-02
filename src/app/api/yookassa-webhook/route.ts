import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { getPayment } from "@/lib/yookassa";

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

  // Обновляем заказ по order_id из metadata (надёжнее) или по id платежа.
  let q = admin.from("orders").update(patch);
  if (orderId) q = q.eq("id", orderId);
  else q = q.eq("yk_payment_id", String(paymentId));
  await q;

  return NextResponse.json({ ok: true }, { status: 200 });
}
