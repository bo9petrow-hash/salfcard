"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Check,
  Eye,
  Lock,
  Plus,
  Save,
  Upload,
  X,
} from "lucide-react";

import { AuthGuard } from "@/components/AuthGuard";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { settingsSchema, type SettingsValues } from "@/lib/schemas";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { createDefaultSettings, compressImageFile, uid } from "@/lib/utils";
import {
  NETWORKING_ACTION_OPTIONS,
  CUSTOM_ACTION_VALUE,
  type MultilinkSettings,
} from "@/types";

export default function EditMultilinkPage() {
  return (
    <AuthGuard>
      <EditMultilink />
    </AuthGuard>
  );
}

function EditMultilink() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const hydrated = useHydrated();

  const multilink = useStore((s) => s.user.multilinks.find((m) => m.id === id));
  const tariff = useStore((s) => s.user.tariff);
  const updateMultilink = useStore((s) => s.updateMultilink);

  const isBusiness = tariff === "Бизнес";
  const [saved, setSaved] = useState(false);
  const [customAction, setCustomAction] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: createDefaultSettings(),
  });

  const personalButtons = useFieldArray({
    control,
    name: "contacts.personal.customButtons",
  });
  const workButtons = useFieldArray({
    control,
    name: "contacts.work.customButtons",
  });

  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (hydrated && multilink && loadedRef.current !== multilink.id) {
      reset(multilink.settings);
      loadedRef.current = multilink.id;
      // Определяем, был ли сохранён «свой вариант» кнопки действия.
      const lbl = multilink.settings.contacts.actionButton.label;
      setCustomAction(
        multilink.type === "self" &&
          !!lbl &&
          lbl !== "Не использовать" &&
          !(NETWORKING_ACTION_OPTIONS as readonly string[]).includes(lbl)
      );
    }
  }, [hydrated, multilink, reset]);

  const actionLabel = watch("contacts.actionButton.label");
  const logo = watch("logo");
  const background = watch("background");

  const persist = (values: SettingsValues) => {
    if (!id) return;
    updateMultilink(id, values as MultilinkSettings);
  };

  // Сохранение всегда берёт актуальные значения формы и пишет их в Zustand
  // (и через persist — в localStorage), не блокируясь валидацией.
  const saveNow = () => {
    persist(getValues());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  // Сохраняем и открываем превью в этой же вкладке (надёжно на мобильных).
  const openPreview = () => {
    persist(getValues());
    router.push(`/preview/${id}`);
  };

  if (!hydrated) {
    return <PageSkeleton />;
  }

  if (!multilink) {
    return (
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          На главную
        </Link>
        <SectionCard title="Визитка не найдена">
          <p className="text-sm text-slate-300">
            Такой мультиссылки нет. Возможно, она была удалена.
          </p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Вернуться на главную
          </Button>
        </SectionCard>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveNow();
      }}
      className="space-y-5"
    >
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        Назад
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Настройки</h1>
          <p className="mt-1 text-sm text-slate-400">
            {multilink.title} · salfcard.ru/p/{multilink.slug}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={openPreview}>
            <Eye size={16} />
            Просмотреть страницу
          </Button>
          <Button type="submit">
            <Save size={16} />
            Сохранить
          </Button>
        </div>
      </div>

      {/* Управление данными страницы */}
      <SectionCard title="Управление данными страницы">
        <div className="space-y-5">
          <Field label="Имя Фамилия" required error={errors.name?.message}>
            <Input placeholder="Иван Петров" {...register("name")} />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-200">
              Оформление страницы
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <UploadField
                label="Логотип"
                disabled={!isBusiness}
                value={logo}
                preview="logo"
                onPick={(dataUrl) =>
                  setValue("logo", dataUrl, { shouldDirty: true })
                }
                onClear={() =>
                  setValue("logo", undefined, { shouldDirty: true })
                }
              />
              <UploadField
                label="Фоновое изображение"
                disabled={!isBusiness}
                value={background}
                preview="bg"
                onPick={(dataUrl) =>
                  setValue("background", dataUrl, { shouldDirty: true })
                }
                onClear={() =>
                  setValue("background", undefined, { shouldDirty: true })
                }
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Личные контакты */}
      <SectionCard title="Личные контакты">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ФИО">
              <Input
                placeholder="Иван Петров"
                {...register("contacts.personal.name")}
              />
            </Field>
            <Field
              label="Телефон"
              error={errors.contacts?.personal?.phone?.message}
            >
              <Input
                placeholder="+7 900 000-00-00"
                {...register("contacts.personal.phone")}
              />
            </Field>
            <Field
              label="Email"
              error={errors.contacts?.personal?.email?.message}
            >
              <Input
                placeholder="ivan@example.com"
                {...register("contacts.personal.email")}
              />
            </Field>
            <Field label="Сайт">
              <Input
                placeholder="example.com"
                {...register("contacts.personal.website")}
              />
            </Field>
          </div>

          <CustomButtonList
            fields={personalButtons.fields}
            register={register}
            remove={personalButtons.remove}
            append={() =>
              personalButtons.append({ id: uid(), label: "", url: "" })
            }
            namePrefix="contacts.personal.customButtons"
            groupLabel="Личные контакты"
            errors={errors.contacts?.personal?.customButtons}
          />
        </div>
      </SectionCard>

      {/* Рабочие контакты */}
      <SectionCard title="Рабочие контакты">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Компания">
              <Input
                placeholder="ООО «Компания»"
                {...register("contacts.work.company")}
              />
            </Field>
            <Field label="Должность">
              <Input
                placeholder="Менеджер"
                {...register("contacts.work.position")}
              />
            </Field>
            <Field
              label="Рабочий телефон"
              error={errors.contacts?.work?.phone?.message}
            >
              <Input
                placeholder="+7 900 000-00-00"
                {...register("contacts.work.phone")}
              />
            </Field>
            <Field
              label="Рабочая почта"
              error={errors.contacts?.work?.email?.message}
            >
              <Input
                placeholder="work@example.com"
                {...register("contacts.work.email")}
              />
            </Field>
            <Field label="Рабочий сайт" className="sm:col-span-2">
              <Input
                placeholder="company.com"
                {...register("contacts.work.website")}
              />
            </Field>
          </div>

          <CustomButtonList
            fields={workButtons.fields}
            register={register}
            remove={workButtons.remove}
            append={() => workButtons.append({ id: uid(), label: "", url: "" })}
            namePrefix="contacts.work.customButtons"
            groupLabel="Рабочие контакты"
            errors={errors.contacts?.work?.customButtons}
          />
        </div>
      </SectionCard>

      {/* Соцсети и мессенджеры */}
      <SectionCard title="Соцсети и мессенджеры">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telegram (username)">
            <Input
              placeholder="@username"
              {...register("contacts.social.telegram")}
            />
          </Field>
          <Field label="Мессенджер (номер телефона)">
            <Input
              placeholder="+7 900 000-00-00"
              {...register("contacts.social.messenger")}
            />
          </Field>
          <Field label="VK (id123 или никнейм)">
            <Input placeholder="id123" {...register("contacts.social.vk")} />
          </Field>
          <Field label="YouTube (@channel)">
            <Input
              placeholder="@channel"
              {...register("contacts.social.youtube")}
            />
          </Field>
          <Field label="Rutube (ссылка на канал)">
            <Input
              placeholder="rutube.ru/channel/..."
              {...register("contacts.social.rutube")}
            />
          </Field>
          <Field label="MAX (ссылка)">
            <Input placeholder="max.ru/..." {...register("contacts.social.max")} />
          </Field>
        </div>
      </SectionCard>

      {/* Кнопка действия */}
      <SectionCard title="Кнопка действия">
        {multilink.type === "self" ? (
          // Нетворкинг: выпадающий список пресетов + «Свой вариант».
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Название кнопки">
              <Select
                value={
                  customAction
                    ? CUSTOM_ACTION_VALUE
                    : actionLabel || "Не использовать"
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === CUSTOM_ACTION_VALUE) {
                    setCustomAction(true);
                    setValue("contacts.actionButton.label", "", {
                      shouldDirty: true,
                    });
                  } else {
                    setCustomAction(false);
                    setValue("contacts.actionButton.label", v, {
                      shouldDirty: true,
                    });
                  }
                }}
              >
                {NETWORKING_ACTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value={CUSTOM_ACTION_VALUE}>Свой вариант</option>
              </Select>
            </Field>

            {customAction && (
              <Field label="Своё название кнопки">
                <Input
                  placeholder="Например, Перейти в магазин"
                  {...register("contacts.actionButton.label")}
                />
              </Field>
            )}

            {(customAction ||
              (actionLabel && actionLabel !== "Не использовать")) && (
              <Field
                label="Ссылка / значение"
                className={customAction ? "sm:col-span-2" : ""}
              >
                <Input
                  placeholder="Например, https://... или +7 900 000-00-00"
                  {...register("contacts.actionButton.url")}
                />
              </Field>
            )}
          </div>
        ) : (
          // Офлайн точка: свободное название + ссылка.
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Название кнопки" hint="Оставьте пустым, если кнопка не нужна.">
              <Input
                placeholder="Например, Меню заведения"
                {...register("contacts.actionButton.label")}
              />
            </Field>
            {actionLabel && actionLabel !== "Не использовать" && (
              <Field label="Ссылка / значение">
                <Input
                  placeholder="Например, https://..."
                  {...register("contacts.actionButton.url")}
                />
              </Field>
            )}
          </div>
        )}
      </SectionCard>

      {/* Обо мне */}
      <SectionCard title="Обо мне">
        <Field label="Пара слов о себе">
          <Textarea
            placeholder="Коротко расскажите о себе или своём деле…"
            {...register("contacts.about")}
          />
        </Field>
      </SectionCard>

      {/* Нижние кнопки */}
      <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
        {saved && (
          <span className="mr-auto inline-flex items-center gap-1.5 text-sm text-brand-light">
            <Check size={16} />
            Изменения сохранены
          </span>
        )}
        <Button type="button" variant="secondary" onClick={openPreview}>
          <Eye size={16} />
          Просмотреть страницу
        </Button>
        <Button type="submit">
          <Save size={16} />
          Сохранить
        </Button>
      </div>
    </form>
  );
}

/* ---------- Вспомогательные компоненты ---------- */

function UploadField({
  label,
  disabled,
  value,
  preview,
  onPick,
  onClear,
}: {
  label: string;
  disabled: boolean;
  value?: string;
  preview: "logo" | "bg";
  onPick: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Логотип — небольшой PNG (сохраняем прозрачность), фон — сжатый JPEG.
    const dataUrl =
      preview === "logo"
        ? await compressImageFile(file, { maxDimension: 400, mime: "image/png" })
        : await compressImageFile(file, {
            maxDimension: 1280,
            mime: "image/jpeg",
            quality: 0.82,
          });
    onPick(dataUrl);
    e.target.value = "";
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {disabled && <Lock size={13} className="text-slate-500" />}
      </div>

      {/* Превью, если файл выбран */}
      {!disabled && value && (
        <div className="relative overflow-hidden rounded-lg border border-white/12 bg-night-900/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className={
              preview === "logo"
                ? "mx-auto h-20 w-20 object-contain py-2"
                : "h-24 w-full object-cover"
            }
          />
          <button
            type="button"
            onClick={onClear}
            aria-label="Убрать изображение"
            className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div
        className={`flex items-center gap-3 rounded-lg border border-dashed px-3.5 py-3 ${
          disabled
            ? "border-white/10 bg-white/[0.02]"
            : "border-white/15 bg-white/5"
        }`}
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={15} />
          Выбрать файл
        </Button>
        <span className="text-xs text-slate-400">
          {value && !disabled ? "Файл выбран" : "Файл не выбран"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={handleFile}
        />
      </div>

      {disabled && (
        <p className="text-xs text-slate-400">Доступно в тарифе «Бизнес»</p>
      )}
    </div>
  );
}

interface CustomButtonListProps {
  fields: { id: string }[];
  register: any;
  remove: (index: number) => void;
  append: () => void;
  namePrefix: string;
  groupLabel: string;
  errors?: any;
}

function CustomButtonList({
  fields,
  register,
  remove,
  append,
  namePrefix,
  groupLabel,
  errors,
}: CustomButtonListProps) {
  const atLimit = fields.length >= 5;
  return (
    <div className="space-y-3">
      {fields.length > 0 && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <div>
                  <Input
                    placeholder="Название кнопки"
                    {...register(`${namePrefix}.${index}.label`)}
                  />
                  {errors?.[index]?.label?.message && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors[index].label.message}
                    </p>
                  )}
                </div>
                <div>
                  <Input
                    placeholder="Ссылка"
                    {...register(`${namePrefix}.${index}.url`)}
                  />
                  {errors?.[index]?.url?.message && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors[index].url.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label="Удалить кнопку"
                className="mt-0.5 inline-flex h-11 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={append}
        disabled={atLimit}
      >
        <Plus size={15} />
        Добавить кнопку в {groupLabel} ({fields.length}/5)
      </Button>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
      <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5"
        />
      ))}
    </div>
  );
}
