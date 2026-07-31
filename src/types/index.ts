export type Tariff = "Базовый" | "Бизнес";

export type MultilinkType = "self" | "offline";

export interface CustomButton {
  id: string;
  label: string;
  url: string;
}

export interface PersonalContacts {
  name: string;
  phone: string;
  email: string;
  website: string;
  customButtons: CustomButton[];
}

export interface WorkContacts {
  company: string;
  position: string;
  phone: string;
  email: string;
  website: string;
  customButtons: CustomButton[];
}

export interface SocialLinks {
  telegram: string;
  messenger: string;
  vk: string;
  youtube: string;
  rutube: string;
  max: string;
}

export interface ActionButton {
  label: string;
  url: string;
}

export interface MultilinkSettings {
  name: string;
  logo?: string;
  background?: string;
  contacts: {
    personal: PersonalContacts;
    work: WorkContacts;
    social: SocialLinks;
    actionButton: ActionButton;
    about: string;
  };
}

export interface Multilink {
  id: string;
  title: string;
  slug: string;
  language: string;
  type: MultilinkType;
  settings: MultilinkSettings;
}

export interface Redirect {
  id: string;
  title: string;
  url: string;
}

export type NfcStatus = "active" | "inactive";

export interface NfcDevice {
  id: string;
  name: string;
  status: NfcStatus;
  /** ID привязанной мультиссылки, если есть. */
  multilinkId?: string;
}

export interface User {
  name: string;
  email?: string;
  avatar?: string;
  tariff: Tariff;
  multilinks: Multilink[];
  redirects: Redirect[];
  nfcDevices: NfcDevice[];
}

export const LANGUAGES = [
  "Русский",
  "Английский",
  "Немецкий",
  "Испанский",
  "Китайский",
] as const;

export const ACTION_BUTTON_OPTIONS = [
  "Не использовать",
  "Позвонить",
  "Написать в Telegram",
  "Написать на почту",
  "Перейти на сайт",
] as const;

// Лимиты мультиссылок по тарифам
export const TARIFF_LIMITS: Record<Tariff, number> = {
  "Базовый": 2,
  "Бизнес": Infinity,
};
