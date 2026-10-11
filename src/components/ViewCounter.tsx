"use client";

import { useEffect, useRef } from "react";

const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** +1 просмотр через свой домен (/sb → Supabase), без загрузки библиотеки Supabase. */
function incrementCardViews(slug: string) {
  if (!ANON) return Promise.resolve();
  return fetch("/sb/rest/v1/rpc/increment_card_views", {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ card_slug: slug }),
    keepalive: true,
  });
}

/** Невидимый счётчик: при открытии публичной визитки прибавляет просмотр. */
export function ViewCounter({ slug }: { slug: string }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || !slug) return;
    firedRef.current = true;
    incrementCardViews(slug).catch(() => {
      /* счётчик не критичен — молча игнорируем */
    });
  }, [slug]);

  return null;
}
