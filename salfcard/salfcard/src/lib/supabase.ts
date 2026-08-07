import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Настроен ли Supabase (заданы ли переменные окружения). */
export const isSupabaseConfigured = Boolean(URL && ANON);

/**
 * Публичный клиент (anon/publishable ключ) — только чтение,
 * доступ ограничен политиками RLS. Безопасен на сервере и в браузере.
 */
export function getSupabasePublic(): SupabaseClient | null {
  if (!URL || !ANON) return null;
  return createClient(URL, ANON, {
    auth: { persistSession: false },
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
  });
}
