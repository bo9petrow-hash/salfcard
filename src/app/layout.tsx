import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { StarsBackground } from "@/components/StarsBackground";

export const metadata: Metadata = {
  title: "SALFCARD — панель управления",
  description:
    "Платформа NFC-визиток SALFCARD: мультиссылки, переадресация и NFC-носители.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
        <Header />
        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
