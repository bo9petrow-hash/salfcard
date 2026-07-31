import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  Multilink,
  MultilinkSettings,
  MultilinkType,
  NfcDevice,
  Redirect,
  Tariff,
  User,
} from "@/types";
import { createDefaultSettings, generateSlug, uid } from "@/lib/utils";

interface CreateMultilinkInput {
  title: string;
  slug?: string;
  language: string;
  type: MultilinkType;
}

interface Account {
  email: string;
  password: string;
}

interface StoreState {
  user: User;

  // Аутентификация
  isAuthenticated: boolean;
  account: Account | null;
  register: (email: string, password: string) => { ok: boolean; message: string };
  login: (email: string, password: string) => { ok: boolean; message: string };

  // Профиль
  setName: (name: string) => void;
  setAvatar: (avatar: string | undefined) => void;

  // Промокоды и тариф
  applyPromo: (code: string) => { ok: boolean; message: string };
  setTariff: (tariff: Tariff) => void;

  // Мультиссылки
  createMultilink: (input: CreateMultilinkInput) => string;
  updateMultilink: (id: string, settings: MultilinkSettings) => void;
  deleteMultilink: (id: string) => void;
  getMultilink: (id: string) => Multilink | undefined;

  // Переадресации
  addRedirect: (title: string, url: string) => void;
  deleteRedirect: (id: string) => void;

  // NFC-носители
  addNfcDevice: (name: string) => string;
  updateNfcDevice: (id: string, patch: Partial<Omit<NfcDevice, "id">>) => void;
  deleteNfcDevice: (id: string) => void;

  // Сессия
  logout: () => void;
}

const initialUser: User = {
  name: "",
  tariff: "Базовый",
  multilinks: [],
  redirects: [],
  nfcDevices: [],
};

// Промокоды-заглушки: любой из них повышает тариф до «Бизнес».
const BUSINESS_PROMOS = new Set(["SALFCARD", "BUSINESS", "БИЗНЕС", "PRO2025"]);

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: initialUser,

      isAuthenticated: false,
      account: null,

      register: (email, password) => {
        const clean = email.trim().toLowerCase();
        set((state) => ({
          account: { email: clean, password },
          isAuthenticated: true,
          user: { ...state.user, email: clean },
        }));
        return { ok: true, message: "Регистрация завершена" };
      },

      login: (email, password) => {
        const clean = email.trim().toLowerCase();
        const acc = get().account;
        // Если аккаунт уже зарегистрирован — проверяем совпадение.
        if (acc && (acc.email !== clean || acc.password !== password)) {
          return { ok: false, message: "Неверный email или пароль" };
        }
        set((state) => ({
          isAuthenticated: true,
          user: { ...state.user, email: clean },
        }));
        return { ok: true, message: "Вход выполнен" };
      },

      setName: (name) =>
        set((state) => ({ user: { ...state.user, name: name.trim() } })),

      setAvatar: (avatar) =>
        set((state) => ({ user: { ...state.user, avatar } })),

      applyPromo: (code) => {
        const clean = code.trim().toUpperCase();
        if (!clean) {
          return { ok: false, message: "Введите промокод" };
        }
        if (BUSINESS_PROMOS.has(clean)) {
          set((state) => ({
            user: { ...state.user, tariff: "Бизнес" },
          }));
          return {
            ok: true,
            message: "Промокод применён — активирован тариф «Бизнес»",
          };
        }
        return { ok: false, message: "Промокод не найден или недействителен" };
      },

      setTariff: (tariff) =>
        set((state) => ({ user: { ...state.user, tariff } })),

      createMultilink: (input) => {
        const id = uid();
        const slug =
          input.slug && input.slug.length > 0 ? input.slug : generateSlug();
        const settings = createDefaultSettings();

        const multilink: Multilink = {
          id,
          title: input.title,
          slug,
          language: input.language,
          type: input.type,
          settings,
        };

        set((state) => ({
          user: {
            ...state.user,
            multilinks: [...state.user.multilinks, multilink],
          },
        }));

        return id;
      },

      updateMultilink: (id, settings) =>
        set((state) => ({
          user: {
            ...state.user,
            multilinks: state.user.multilinks.map((m) =>
              m.id === id ? { ...m, settings } : m
            ),
          },
        })),

      deleteMultilink: (id) =>
        set((state) => ({
          user: {
            ...state.user,
            multilinks: state.user.multilinks.filter((m) => m.id !== id),
            // Отвязываем удалённую мультиссылку от NFC-носителей.
            nfcDevices: state.user.nfcDevices.map((n) =>
              n.multilinkId === id
                ? { ...n, multilinkId: undefined, status: "inactive" }
                : n
            ),
          },
        })),

      getMultilink: (id) => get().user.multilinks.find((m) => m.id === id),

      addRedirect: (title, url) => {
        const redirect: Redirect = { id: uid(), title, url };
        set((state) => ({
          user: {
            ...state.user,
            redirects: [...state.user.redirects, redirect],
          },
        }));
      },

      deleteRedirect: (id) =>
        set((state) => ({
          user: {
            ...state.user,
            redirects: state.user.redirects.filter((r) => r.id !== id),
          },
        })),

      addNfcDevice: (name) => {
        const id = uid();
        const device: NfcDevice = { id, name, status: "inactive" };
        set((state) => ({
          user: {
            ...state.user,
            nfcDevices: [...state.user.nfcDevices, device],
          },
        }));
        return id;
      },

      updateNfcDevice: (id, patch) =>
        set((state) => ({
          user: {
            ...state.user,
            nfcDevices: state.user.nfcDevices.map((n) =>
              n.id === id ? { ...n, ...patch } : n
            ),
          },
        })),

      deleteNfcDevice: (id) =>
        set((state) => ({
          user: {
            ...state.user,
            nfcDevices: state.user.nfcDevices.filter((n) => n.id !== id),
          },
        })),

      // Сбрасываем данные текущей сессии, но сохраняем аккаунт для повторного входа.
      logout: () => set({ user: initialUser, isAuthenticated: false }),
    }),
    {
      name: "salfcard-store",
      // Безопасное хранилище: на сервере (SSR) не обращаемся к localStorage,
      // а запись оборачиваем в try/catch, чтобы переполнение не роняло приложение.
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? {
              getItem: (key) => window.localStorage.getItem(key),
              setItem: (key, value) => {
                try {
                  window.localStorage.setItem(key, value);
                } catch (e) {
                  // Например, QuotaExceededError при слишком большом изображении.
                  console.warn("Не удалось записать в localStorage:", e);
                }
              },
              removeItem: (key) => window.localStorage.removeItem(key),
            }
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      // Совместимость со старыми сохранениями: нормализуем форму user,
      // переносим nfcProducts -> nfcDevices и гарантируем наличие массивов.
      merge: (persisted, current) => {
        const p = persisted as any;
        if (!p || !p.user) return current as StoreState;
        const pu = p.user;
        const nfcDevices = Array.isArray(pu.nfcDevices)
          ? pu.nfcDevices
          : Array.isArray(pu.nfcProducts)
          ? pu.nfcProducts.map((x: any) => ({
              id: x.id,
              name: x.name,
              status: "inactive" as const,
            }))
          : [];
        return {
          ...(current as StoreState),
          ...p,
          user: {
            ...(current as StoreState).user,
            ...pu,
            multilinks: Array.isArray(pu.multilinks) ? pu.multilinks : [],
            redirects: Array.isArray(pu.redirects) ? pu.redirects : [],
            nfcDevices,
          },
        } as StoreState;
      },
    }
  )
);
