"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { QrCode } from "lucide-react";

import { Modal } from "@/components/ui/Card";

// Библиотека QR подгружается только по нажатию кнопки — визитка не тяжелеет.
const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  {
    ssr: false,
    loading: () => <div className="h-[240px] w-[240px] animate-pulse rounded-lg bg-slate-200" />,
  }
);

/**
 * Кнопка «QR» в шапке визитки. Открывает крупный QR-код со ссылкой на эту
 * визитку: если у собеседника не срабатывает NFC, он просто сканирует код
 * камерой телефона.
 */
export function CardQrButton({ slug, name }: { slug: string; name?: string }) {
  const [open, setOpen] = useState(false);
  if (!slug) return null;

  const url = `https://app.selfcards.ru/p/${slug}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Показать QR-код визитки"
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-night-900/50 px-2.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-night-900/70"
      >
        <QrCode size={18} />
        QR
      </button>

      {/* Окно рендерим в body: у карточки overflow-hidden и blur, внутри неё
          fixed-окно обрезалось бы рамками визитки. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <Modal open={open} onClose={() => setOpen(false)} title="QR-код визитки">
            <div className="space-y-4">
              <p className="text-center text-sm text-slate-300">
                Покажите этот код собеседнику — пусть наведёт камеру телефона,
                и визитка{name ? ` «${name}»` : ""} откроется.
              </p>

              <div className="flex justify-center">
                <div className="rounded-2xl bg-white p-4">
                  <QRCodeSVG value={url} size={240} level="M" />
                </div>
              </div>

              <p className="break-all text-center text-xs text-slate-400">{url}</p>
            </div>
          </Modal>,
          document.body
        )}
    </>
  );
}
