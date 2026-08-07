"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Заглушка Yandex SmartCaptcha.
 * Чекбокс «Я не робот»: при клике имитирует короткую проверку
 * и переходит в отмеченное состояние. Реальной проверки нет.
 */
export function SmartCaptcha({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (loading) return;
    if (checked) {
      onChange(false);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onChange(true);
    }, 550);
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/12 bg-white/5 px-4 py-3">
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-3 text-sm text-slate-200"
        aria-pressed={checked}
      >
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded border transition-colors",
            checked
              ? "border-brand-light bg-brand-gradient"
              : "border-white/30 bg-night-900/40"
          )}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin text-slate-300" />
          ) : checked ? (
            <Check size={15} className="text-white" />
          ) : null}
        </span>
        <span>Я не робот</span>
      </button>

      <span className="flex flex-col items-end leading-none">
        <span className="text-[11px] font-semibold text-slate-400">
          SmartCaptcha
        </span>
        <span className="mt-0.5 text-[9px] text-slate-500">by Yandex</span>
      </span>
    </div>
  );
}
