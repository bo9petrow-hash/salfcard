import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { StarsBackground } from "@/components/StarsBackground";
import { AuthProvider } from "@/components/AuthProvider";
import { ProfileSync } from "@/components/ProfileSync";

export const metadata: Metadata = {
  metadataBase: new URL("https://selfcards.ru"),
  title: "SELFCARDS — NFC-визитки",
  description:
    "Умные NFC-визитки SELFCARDS: одним касанием делитесь контактами, ссылками и соцсетями. Визитки для людей и заведений.",
  openGraph: {
    title: "SELFCARDS — NFC-визитки",
    description:
      "Одним касанием — все ваши контакты и ссылки. Визитки для людей и заведений.",
    url: "https://selfcards.ru",
    siteName: "SELFCARDS",
    type: "website",
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
          <ProfileSync />
          <Header />
          <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
