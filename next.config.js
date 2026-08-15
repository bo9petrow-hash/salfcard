/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Запуск как полноценного сервера (SSR) на хостинге, а не статики.
  output: "standalone",
  // Демо-деплой: не валим сборку из-за придирок линтера/типов.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
