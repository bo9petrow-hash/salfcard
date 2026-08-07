import { useEffect, useState } from "react";

/**
 * Возвращает true после гидратации на клиенте.
 * Используется, чтобы не показывать данные из persist-стора
 * до монтирования и избежать расхождения SSR/CSR.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
