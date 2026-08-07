"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { useAuth } from "@/components/AuthProvider";
import { fetchProfile, saveProfile } from "@/lib/profile";

/**
 * Синхронизация профиля (имя, аватар, тариф, переадресации, NFC) с базой:
 * при входе загружает из базы (или создаёт из локальных данных),
 * при изменениях — сохраняет обратно с небольшой задержкой.
 * Ничего не ломает: при ошибке базы остаётся на локальных данных.
 */
export function ProfileSync() {
  const { userId } = useAuth();
  const hydrated = useHydrated();
  const loadedRef = useRef<string | null>(null);
  const applyingRef = useRef(false);

  // Первичная загрузка профиля для вошедшего пользователя.
  useEffect(() => {
    if (!hydrated || !userId || loadedRef.current === userId) return;
    loadedRef.current = userId;
    (async () => {
      try {
        const profile = await fetchProfile(userId);
        if (profile) {
          applyingRef.current = true;
          useStore.getState().applyProfile(profile);
          applyingRef.current = false;
        } else {
          // Строки ещё нет — создаём из текущих локальных данных.
          const u = useStore.getState().user;
          await saveProfile(userId, {
            name: u.name,
            avatar: u.avatar,
            tariff: u.tariff,
            redirects: u.redirects,
            nfcDevices: u.nfcDevices,
          });
        }
      } catch {
        applyingRef.current = false;
        /* база недоступна — работаем на локальных данных */
      }
    })();
  }, [hydrated, userId]);

  // Автосохранение изменений профиля в базу (с задержкой).
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((state, prev) => {
      const u = state.user;
      const p = prev.user;
      const changed =
        u.name !== p.name ||
        u.avatar !== p.avatar ||
        u.tariff !== p.tariff ||
        u.redirects !== p.redirects ||
        u.nfcDevices !== p.nfcDevices;
      if (!changed) return;
      if (applyingRef.current) return; // не сохраняем то, что сами только что загрузили
      if (loadedRef.current !== userId) return; // до первичной загрузки не пишем
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        saveProfile(userId, {
          name: u.name,
          avatar: u.avatar,
          tariff: u.tariff,
          redirects: u.redirects,
          nfcDevices: u.nfcDevices,
        }).catch(() => {
          /* сохраним при следующем изменении */
        });
      }, 800);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [userId]);

  return null;
}
