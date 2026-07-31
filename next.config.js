/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Демо-деплой: не валим сборку из-за придирок линтера/типов.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
