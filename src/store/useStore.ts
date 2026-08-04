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

  // Аутентификация (несколько аккаунтов в одном браузере)
  isAuthenticated: boolean;
  accounts: Account[];
  currentEmail: string | null;
  usersByEmail: Record<string, User>;
  register: (email: string, password: string) => { ok: boolean; message: string };
  login: (email: string, password: string) => { ok: boolean; message: string };
  // Загрузка данных аккаунта по email (используется с авторизацией Supabase).
  setActiveAccount: (email: string) => void;

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

/** Новый пустой пользователь для только что зарегистрированного аккаунта. */
const freshUser = (email: string): User => ({
  name: "",
  email,
  tariff: "Базовый",
  multilinks: [],
  redirects: [],
  nfcDevices: [],
});

/** Приводит данные пользователя к корректной форме (массивы, старые поля). */
const normalizeUser = (u: any): User => ({
  name: typeof u?.name === "string" ? u.name : "",
  email: u?.email,
  avatar: u?.avatar,
  tariff: u?.tariff === "Бизнес" ? "Бизнес" : "Базовый",
  multilinks: Array.isArray(u?.multilinks) ? u.multilinks : [],
  redirects: Array.isArray(u?.redirects) ? u.redirects : [],
  nfcDevices: Array.isArray(u?.nfcDevices)
    ? u.nfcDevices
    : Array.isArray(u?.nfcProducts)
    ? u.nfcProducts.map((x: any) => ({
        id: x.id,
        name: x.name,
        status: "inactive" as const,
      }))
    : [],
});

// Промокоды-заглушки: любой из них повышает тариф до «Бизнес».
const BUSINESS_PROMOS = new Set(["SELFCARD", "BUSINESS", "БИЗНЕС", "PRO2025"]);

// Флаг последней записи в localStorage: false — если она сорвалась
// (например, переполнение хранилища). Читается страницами после сохранения.
export const storageStatus = { ok: true };

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: initialUser,

      isAuthenticated: false,
      accounts: [],
      currentEmail: null,
      usersByEmail: {},

      register: (email, password) => {
        const clean = email.trim().toLowerCase();
        if (!clean) return { ok: false, message: "Введите email" };
        const state = get();
        if (state.accounts.some((a) => a.email === clean)) {
          return {
            ok: false,
            message: "Пользователь с таким email уже зарегистрирован. Войдите.",
          };
        }
        set((s) => {
          // Сохраняем данные активного аккаунта перед переключением.
          const usersByEmail = { ...s.usersByEmail };
          if (s.currentEmail) usersByEmail[s.currentEmail] = s.user;
          const newUser = freshUser(clean);
          usersByEmail[clean] = newUser;
          return {
            accounts: [...s.accounts, { email: clean, password }],
            usersByEmail,
            user: newUser,
            currentEmail: clean,
            isAuthenticated: true,
          };
        });
        return { ok: true, message: "Регистрация завершена" };
      },

      login: (email, password) => {
        const clean = email.trim().toLowerCase();
        const state = get();
        const acc = state.accounts.find((a) => a.email === clean);
        if (!acc) {
          return {
            ok: false,
            message: "Пользователь не найден. Сначала зарегистрируйтесь.",
          };
        }
        if (acc.password !== password) {
          return { ok: false, message: "Неверный пароль." };
        }
        set((s) => {
          // Тот же аккаунт уже активен — данные не трогаем.
          if (s.currentEmail === clean) {
            return { isAuthenticated: true };
          }
          // Переключение: сохраняем текущего, загружаем данные нужного аккаунта.
          const usersByEmail = { ...s.usersByEmail };
          if (s.currentEmail) usersByEmail[s.currentEmail] = s.user;
          const nextUser = usersByEmail[clean]
            ? normalizeUser(usersByEmail[clean])
            : freshUser(clean);
          return {
            usersByEmail,
            user: nextUser,
            currentEmail: clean,
            isAuthenticated: true,
          };
        });
        return { ok: true, message: "Вход выполнен" };
      },

      setName: (name) =>
        set((state) => ({ user: { ...state.user, name: name.trim() } })),

      setAvatar: (avatar) =>
        set((state) => ({ user: { ...state.user, avatar } })),

      setActiveAccount: (email) => {
        const clean = email.trim().toLowerCase();
        set((s) => {
          if (s.currentEmail === clean) return {};
          const usersByEmail = { ...s.usersByEmail };
          if (s.currentEmail) usersByEmail[s.currentEmail] = s.user;
          const nextUser = usersByEmail[clean]
            ? normalizeUser(usersByEmail[clean])
            : freshUser(clean);
          return { usersByEmail, user: nextUser, currentEmail: clean };
        });
      },

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

      // Сохраняем данные активного аккаунта и выходим (данные не теряются).
      logout: () =>
        set((s) => {
          const usersByEmail = { ...s.usersByEmail };
          if (s.currentEmail) usersByEmail[s.currentEmail] = s.user;
          return { usersByEmail, isAuthenticated: false };
        }),
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
                  storageStatus.ok = true;
                } catch (e) {
                  // Например, QuotaExceededError при слишком большом изображении.
                  storageStatus.ok = false;
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
      // Совместимость со старыми сохранениями: нормализуем активного пользователя
      // и переводим единственный account в список accounts + usersByEmail.
      merge: (persisted, current) => {
        const cur = current as StoreState;
        const p = persisted as any;
        if (!p) return cur;

        const user = p.user ? normalizeUser(p.user) : cur.user;

        // Аккаунты: новый формат (accounts) или старый (account).
        const accounts = Array.isArray(p.accounts)
          ? p.accounts
          : p.account
          ? [p.account]
          : [];

        const currentEmail =
          p.currentEmail ?? user.email ?? (p.account ? p.account.email : null) ?? null;

        const usersByEmail =
          p.usersByEmail && typeof p.usersByEmail === "object"
            ? { ...p.usersByEmail }
            : {};

        // Активный аккаунт всегда представлен свежими данными user.
        if (currentEmail) usersByEmail[currentEmail] = user;

        return {
          ...cur,
          ...p,
          user,
          accounts,
          currentEmail,
          usersByEmail,
          isAuthenticated: Boolean(p.isAuthenticated),
        } as StoreState;
      },
    }
  )
);
