import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(URL && ANON);

let client: SupabaseClient | null | undefined;

/**
 * Прокси-fetch для Supabase.
 *
 * Прямые запросы браузера к *.supabase.co (хостинг на AWS) режут некоторые
 * российские мобильные операторы — из-за этого вход в панель зависал на
 * мобильном интернете и работал только с включённым VPN.
 *
 * Решение: перенаправляем сетевые запросы Supabase на собственный домен
 * (/sb/*). Сам клиент Supabase при этом продолжает «думать», что работает с
 * обычным адресом (вся его внутренняя логика построения URL не меняется) —
 * подменяется только фактический адрес запроса. Далее next.config.js
 * (rewrites) на сервере переправляет /sb/* на настоящий Supabase.
 * Для оператора это трафик к app.selfcards.ru, который открывается штатно.
 */
function makeProxyFetch(directUrl: string): typeof fetch {
  const base = directUrl.replace(/\/+$/, "");
  return ((input: any, init?: any) => {
    try {
      if (typeof window !== "undefined") {
        const proxyBase = `${window.location.origin}/sb`;
        const urlOf =
          typeof input === "string"
            ? input
            : input instanceof Request
            ? input.url
            : String(input);
        if (urlOf.startsWith(base)) {
          const rewritten = proxyBase + urlOf.slice(base.length);
          if (input instanceof Request) {
            return fetch(new Request(rewritten, input));
          }
          return fetch(rewritten, init);
        }
      }
    } catch {
      // Если что-то пошло не так — тихо откатываемся на обычный fetch.
    }
    return fetch(input, init);
  }) as typeof fetch;
}

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
    global: { fetch: makeProxyFetch(URL) },
  });
  return client;
}
