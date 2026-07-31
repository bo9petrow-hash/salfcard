import type { Multilink, MultilinkSettings } from "@/types";

/** Простое объединение классов (без внешних зависимостей). */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/** Короткий случайный идентификатор. */
export function uid(): string {
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
  );
}

/** Случайный короткий slug для ссылки вида salfcard.ru/p/<slug>. */
export function generateSlug(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** Пустые настройки страницы визитки. */
export function createDefaultSettings(): MultilinkSettings {
  return {
    name: "",
    logo: undefined,
    background: undefined,
    contacts: {
      personal: {
        name: "",
        phone: "",
        email: "",
        website: "",
        customButtons: [],
      },
      work: {
        company: "",
        position: "",
        phone: "",
        email: "",
        website: "",
        customButtons: [],
      },
      social: {
        telegram: "",
        messenger: "",
        vk: "",
        youtube: "",
        rutube: "",
        max: "",
      },
      actionButton: {
        label: "",
        url: "",
      },
      about: "",
    },
  };
}

/** Формирование vCard (.vcf) из данных визитки — «Сохранить в контакты». */
export function buildVCard(ml: Multilink): string {
  const s = ml.settings;
  const p = s.contacts.personal;
  const w = s.contacts.work;
  const fullName = s.name || p.name || ml.title || "Контакт";

  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0", `FN:${fullName}`];

  if (w.company) lines.push(`ORG:${w.company}`);
  if (w.position) lines.push(`TITLE:${w.position}`);
  if (p.phone) lines.push(`TEL;TYPE=CELL:${p.phone}`);
  if (w.phone) lines.push(`TEL;TYPE=WORK:${w.phone}`);
  if (p.email) lines.push(`EMAIL;TYPE=HOME:${p.email}`);
  if (w.email) lines.push(`EMAIL;TYPE=WORK:${w.email}`);
  if (p.website) lines.push(`URL:${p.website}`);
  if (s.contacts.about) lines.push(`NOTE:${s.contacts.about}`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Скачивание файла в браузере. */
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Нормализация URL для внешних ссылок. */
export function normalizeUrl(value: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/** Чтение файла как data-URL (base64) для сохранения картинок в состоянии. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

/** Проверка поддержки Web NFC в браузере. */
export function isNfcSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "NDEFReader" in window || Boolean((navigator as any)?.nfc);
}

export interface NfcWriteResult {
  supported: boolean;
  ok: boolean;
  error?: string;
}

/**
 * Запись URL на физическую NFC-метку.
 * Пытается использовать современный NDEFReader (Chrome на Android),
 * затем устаревший navigator.nfc.push. Если API нет — возвращает supported=false
 * (вызывающий код показывает инструкцию и имитирует успех для демонстрации).
 */
export async function writeNfcTag(url: string): Promise<NfcWriteResult> {
  if (typeof window === "undefined") {
    return { supported: false, ok: false };
  }

  const w = window as any;

  if ("NDEFReader" in window) {
    try {
      const reader = new w.NDEFReader();
      await reader.write({ records: [{ recordType: "url", data: url }] });
      return { supported: true, ok: true };
    } catch (e: any) {
      return {
        supported: true,
        ok: false,
        error: e?.message || "Не удалось записать метку",
      };
    }
  }

  if ((navigator as any)?.nfc?.push) {
    try {
      await (navigator as any).nfc.push({ url });
      return { supported: true, ok: true };
    } catch (e: any) {
      return {
        supported: true,
        ok: false,
        error: e?.message || "Не удалось записать метку",
      };
    }
  }

  return { supported: false, ok: false };
}

/**
 * Уменьшает и сжимает изображение на стороне клиента, возвращая data-URL.
 * Нужно, чтобы аватар/логотип/фон не переполняли localStorage
 * (фото с телефона весит мегабайты, а лимит хранилища ~5 МБ).
 * При любой ошибке возвращает исходный data-URL без обработки.
 */
/** Приблизительный размер data-URL в байтах. */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

export function compressImageFile(
  file: File,
  opts: {
    maxDimension?: number;
    mime?: string;
    quality?: number;
    maxBytes?: number;
  } = {}
): Promise<string> {
  const {
    maxDimension = 1200,
    mime = "image/jpeg",
    quality = 0.82,
    maxBytes = 700_000,
  } = opts;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("Не удалось прочитать файл."));
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      // Файл не читается как картинка (например, HEIC) — сообщаем об этом.
      img.onerror = () =>
        reject(
          new Error(
            "Не удалось обработать изображение. Выберите файл в формате JPG или PNG."
          )
        );
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          const fit = (dim: number) => {
            if (width > dim || height > dim) {
              if (width >= height) {
                height = Math.round((height * dim) / width);
                width = dim;
              } else {
                width = Math.round((width * dim) / height);
                height = dim;
              }
            }
          };
          fit(maxDimension);

          const render = (q: number) => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return src;
            ctx.drawImage(img, 0, 0, width, height);
            return canvas.toDataURL(mime, q);
          };

          let q = quality;
          let out = render(q);
          let guard = 0;
          // Ужимаем, пока не уложимся в бюджет по размеру (качество, затем размер).
          while (dataUrlBytes(out) > maxBytes && guard < 10) {
            guard += 1;
            if (mime !== "image/png" && q > 0.4) {
              q -= 0.12;
            } else {
              width = Math.round(width * 0.85);
              height = Math.round(height * 0.85);
            }
            out = render(q);
          }
          resolve(out);
        } catch {
          reject(
            new Error("Не удалось обработать изображение. Попробуйте другой файл.")
          );
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
