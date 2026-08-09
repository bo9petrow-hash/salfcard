"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { Modal } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/** Показывает QR-код ссылки визитки и позволяет скачать его картинкой. */
export function QrModal({
  open,
  onClose,
  url,
  title,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${title || "selfcards"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Modal open={open} onClose={onClose} title="QR-код визитки">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Наведите камеру телефона на код, чтобы открыть визитку. Удобно
          напечатать рядом с NFC-меткой — если телефон не поддерживает NFC,
          гость просто отсканирует QR.
        </p>

        <div className="flex justify-center">
          <div ref={wrapRef} className="rounded-2xl bg-white p-4">
            <QRCodeCanvas
              value={url}
              size={220}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        <p className="break-all text-center text-xs text-slate-400">{url}</p>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
          <Button onClick={handleDownload}>
            <Download size={16} />
            Скачать PNG
          </Button>
        </div>
      </div>
    </Modal>
  );
}
