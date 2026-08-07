import { z } from "zod";

/** Схема формы создания мультиссылки. */
export const createMultilinkSchema = z.object({
  title: z.string().trim().min(1, "Введите название визитки"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9-_]*$/, "Только латиница, цифры, дефис и подчёркивание"),
  language: z.string().min(1, "Выберите язык"),
  type: z.enum(["self", "offline"], { required_error: "Выберите тип" }),
});

export type CreateMultilinkValues = z.infer<typeof createMultilinkSchema>;

const emailField = z
  .string()
  .trim()
  .email("Некорректный email")
  .or(z.literal(""));

const phoneField = z
  .string()
  .trim()
  .regex(/^[+\d\s()-]*$/, "Некорректный формат телефона");

const customButtonSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1, "Введите название кнопки"),
  url: z.string().trim().min(1, "Введите ссылку"),
});

/** Схема формы редактирования (настроек) визитки. */
export const settingsSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя и фамилию"),
  logo: z.string().optional(),
  background: z.string().optional(),
  contacts: z.object({
    personal: z.object({
      name: z.string().trim(),
      phone: phoneField,
      email: emailField,
      website: z.string().trim(),
      customButtons: z.array(customButtonSchema).max(5, "Не более 5 кнопок"),
    }),
    work: z.object({
      company: z.string().trim(),
      position: z.string().trim(),
      phone: phoneField,
      email: emailField,
      website: z.string().trim(),
      customButtons: z.array(customButtonSchema).max(5, "Не более 5 кнопок"),
    }),
    social: z.object({
      telegram: z.string().trim(),
      messenger: z.string().trim(),
      vk: z.string().trim(),
      youtube: z.string().trim(),
      rutube: z.string().trim(),
      max: z.string().trim(),
    }),
    actionButton: z.object({
      label: z.string(),
      url: z.string().trim(),
    }),
    about: z.string().trim(),
  }),
  business: z.object({
    name: z.string().trim(),
    hours: z.string().trim(),
    address: z.string().trim(),
    wifiName: z.string().trim(),
    wifiPassword: z.string().trim(),
    yandexMaps: z.string().trim(),
    gis2: z.string().trim(),
    reviewLink: z.string().trim(),
  }),
});

export type SettingsValues = z.infer<typeof settingsSchema>;

/** Схема добавления переадресации. */
export const redirectSchema = z.object({
  title: z.string().trim().min(1, "Введите название"),
  url: z.string().trim().min(1, "Введите ссылку для переадресации"),
});

export type RedirectValues = z.infer<typeof redirectSchema>;

/** Схема добавления NFC-носителя. */
export const nfcSchema = z.object({
  name: z.string().trim().min(1, "Введите название носителя"),
});

export type NfcValues = z.infer<typeof nfcSchema>;

/** Схема формы входа. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Введите email")
    .email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginValues = z.infer<typeof loginSchema>;

/** Схема формы регистрации. */
export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Введите email")
      .email("Некорректный email"),
    password: z.string().min(6, "Минимум 6 символов"),
    confirmPassword: z.string().min(1, "Повторите пароль"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type RegisterValues = z.infer<typeof registerSchema>;
