import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(URL && ANON);

let client: SupabaseClient | null | undefined;

/**
 * Единый браузерный клиент Supabase для авторизации.
 * Создаётся только в браузере (persistSession хранит сессию в localStorage),
 * поэтому на сервере возвращает null.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (client !== undefined) return client;
  if (!URL || !ANON) {
    client = null;
    return client;
  }
  client = createClient(URL, ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
