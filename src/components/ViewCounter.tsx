"use client";

import { useEffect, useRef } from "react";
import { incrementCardViews } from "@/lib/cards";

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
