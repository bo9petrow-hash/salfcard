"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { useAuth } from "@/components/AuthProvider";
import { fetchMyCards, saveCard } from "@/lib/cards";

/**
 * Синхронизация карт (мультиссылок) с базой на любой странице.
 * Карты не хранятся в localStorage (partialize их вырезает), поэтому при
 * прямом открытии или обновлении страниц /multilink/[id]/edit, /preview/[id],
 * /settings, /nfc список карт в сторе пуст. Этот компонент один раз при входе
 * подтягивает карты владельца из базы и наполняет стор.
 *
 * База — источник правды: берём карты из базы, а вверх заливаем только те
 * локальные, которых в базе ещё нет (свежесозданные), чтобы не потерять их
 * и не перезаписать свежую версию из базы устаревшей локальной копией.
 */
export function CardsSync() {
  const { userId } = useAuth();
  const hydrated = useHydrated();
  const setMultilinks = useStore((s) => s.setMultilinks);
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !userId || loadedRef.current === userId) return;
    loadedRef.current = userId;
    (async () => {
      try {
        const local = useStore.getState().user.multilinks;
        const dbCards = await fetchMyCards(userId);
        const dbSlugs = new Set(dbCards.map((c) => c.slug));
        // Локальные карты, которых нет в базе (например, только что созданные).
        const localOnly = local.filter((m) => !dbSlugs.has(m.slug));
        for (const m of localOnly) {
          try {
            await saveCard(userId, {
              slug: m.slug,
              type: m.type,
              data: m.settings,
            });
          } catch {
            /* пропускаем отдельную карту */
          }
        }
        setMultilinks([...dbCards, ...localOnly]);
      } catch {
        /* база недоступна — работаем на локальных данных */
      }
    })();
  }, [hydrated, userId, setMultilinks]);

  return null;
}
