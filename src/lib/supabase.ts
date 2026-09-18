import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Настроен ли Supabase (заданы ли переменные окружения). */
export const isSupabaseConfigured = Boolean(URL && ANON);

/**
 * fetch без кэша. Next.js по умолчанию кэширует серверные fetch-запросы
 * (Data Cache), из-за чего публичная страница /p/[slug] показывала устаревшие
 * данные визитки даже после сохранения. no-store гарантирует свежее чтение.
 */
const noStoreFetch: typeof fetch = (input: any, init?: any) =>
  fetch(input, { ...(init || {}), cache: "no-store" });

/**
 * Публичный клиент (anon/publishable ключ) — только чтение,
 * доступ ограничен политиками RLS. Безопасен на сервере и в браузере.
 */
export function getSupabasePublic(): SupabaseClient | null {
  if (!URL || !ANON) return null;
  return createClient(URL, ANON, {
    auth: { persistSession: false },
    global: { fetch: noStoreFetch },
  });
}

/**
 * Серверный клиент (secret/service_role ключ) — запись в базу.
 * ВАЖНО: использовать только в серверном коде (API-роуты), никогда в браузере.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!URL || !SERVICE) return null;
  return createClient(URL, SERVICE, {
    auth: { persistSession: false },
    global: { fetch: noStoreFetch },
  });
}
