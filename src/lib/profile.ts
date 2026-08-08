import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { NfcDevice, Redirect, Tariff } from "@/types";

export interface ProfileData {
  name: string;
  avatar?: string;
  tariff: Tariff;
  redirects: Redirect[];
  nfcDevices: NfcDevice[];
}

/** Загружает профиль текущего пользователя (или null, если строки ещё нет). */
export async function fetchProfile(
  userId: string
): Promise<ProfileData | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("name, avatar, tariff, redirects, nfc_devices")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    name: typeof data.name === "string" ? data.name : "",
    avatar: data.avatar ?? undefined,
    tariff: data.tariff === "Бизнес" ? "Бизнес" : "Базовый",
    redirects: Array.isArray(data.redirects) ? data.redirects : [],
    nfcDevices: Array.isArray(data.nfc_devices) ? data.nfc_devices : [],
  };
}

/** Создаёт или обновляет профиль пользователя. */
export async function saveProfile(
  userId: string,
  profile: ProfileData
): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase || !userId) throw new Error("Supabase не настроен");
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      name: profile.name ?? "",
      avatar: profile.avatar ?? null,
      tariff: profile.tariff,
      redirects: profile.redirects ?? [],
      nfc_devices: profile.nfcDevices ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}
