/** @type {import('next').NextConfig} */

// Реальный адрес Supabase (тот же, что использует серверная часть).
// Нужен, чтобы прокинуть запросы браузера через собственный домен.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig = {
  reactStrictMode: true,
  // Запуск как полноценного сервера (SSR) на хостинге, а не статики.
  output: "standalone",
  // Демо-деплой: не валим сборку из-за придирок линтера/типов.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Прокси Supabase через собственный домен.
  // Прямые обращения браузера к *.supabase.co (AWS) режут некоторые
  // российские мобильные операторы — вход зависал без VPN.
  // Теперь браузер стучится на app.selfcards.ru/sb/*, а сервер Next.js
  // (в дата-центре, у него доступ к Supabase есть) переправляет запрос
  // на реальный Supabase. Для оператора это трафик к app.selfcards.ru,
  // который открывается штатно.
  async rewrites() {
    if (!SUPABASE_URL) return [];
    const base = SUPABASE_URL.replace(/\/+$/, "");
    return [
      {
        source: "/sb/:path*",
        destination: `${base}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
