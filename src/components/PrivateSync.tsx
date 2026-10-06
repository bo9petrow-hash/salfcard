"use client";

import { usePathname } from "next/navigation";

import { ProfileSync } from "@/components/ProfileSync";
import { CardsSync } from "@/components/CardsSync";

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
