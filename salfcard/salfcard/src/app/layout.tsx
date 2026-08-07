import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { StarsBackground } from "@/components/StarsBackground";
import { AuthProvider } from "@/components/AuthProvider";
import { ProfileSync } from "@/components/ProfileSync";

export const metadata: Metadata = {
  title: "SELFCARD — панель управления",
  description:
    "Платформа NFC-визиток SELFCARD: мультиссылки, переадресация и NFC-носители.",
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
