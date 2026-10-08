import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { StarsBackground } from "@/components/StarsBackground";
import { AuthProvider } from "@/components/AuthProvider";
import { PrivateSync } from "@/components/PrivateSync";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.selfcards.ru"),
  title: "SELFCARDS — умные NFC-визитки и таблички для отзывов",
  description:
    "SELFCARDS — NFC-визитки и таблички для отзывов: одно касание телефоном — и ваши контакты, соцсети и ссылки уже у клиента. Работает на iPhone и Android без приложений. Личный кабинет и магазин shop.selfcards.ru.",
  applicationName: "SELFCARDS",
  openGraph: {
    title: "SELFCARDS — умные NFC-визитки",
    description:
      "Одним касанием — все ваши контакты и ссылки. Визитки и таблички для отзывов для людей и заведений.",
    url: "https://app.selfcards.ru",
    siteName: "SELFCARDS",
    type: "website",
    locale: "ru_RU",
    images: [{ url: "https://shop.selfcards.ru/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  verification: {
    yandex: "272ef14fce5643b7",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0F1E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen font-sans">
        <StarsBackground />
        <AuthProvider>
          <PrivateSync />
          <Header />
          <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
