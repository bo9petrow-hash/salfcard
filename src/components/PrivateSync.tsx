"use client";

import { usePathname } from "next/navigation";

import dynamic from "next/dynamic";

// Отдельные файлы: на публичной визитке они (и библиотека Supabase) не грузятся.
const ProfileSync = dynamic(
  () => import("@/components/ProfileSync").then((m) => m.ProfileSync),
  { ssr: false }
);
const CardsSync = dynamic(
  () => import("@/components/CardsSync").then((m) => m.CardsSync),
  { ssr: false }
);

/**
 * Синхронизация профиля и карт нужна только в кабинете. На публичной визитке
 * (/p/...) её не запускаем: иначе у вошедшего владельца при каждом открытии
 * своей визитки грузились все его карты с картинками (~400 КБ, несколько секунд).
 */
export function PrivateSync() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/p/") || pathname.startsWith("/i/")) return null;
  return (
    <>
      <ProfileSync />
      <CardsSync />
    </>
  );
}
