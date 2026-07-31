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
        label: "Не использовать",
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
