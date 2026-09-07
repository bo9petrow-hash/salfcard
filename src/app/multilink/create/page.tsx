"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Check, User as UserIcon } from "lucide-react";

import { useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/components/AuthProvider";
import { saveCard, isSlugTaken } from "@/lib/cards";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  createMultilinkSchema,
  type CreateMultilinkValues,
} from "@/lib/schemas";
import { useStore } from "@/store/useStore";
import { LANGUAGES, TARIFF_LIMITS } from "@/types";
import { cn, generateSlug } from "@/lib/utils";

export default function CreateMultilinkPage() {
  return (
    <AuthGuard>
      <CreateMultilink />
    </AuthGuard>
  );
}

function CreateMultilink() {
  const router = useRouter();
  const createMultilink = useStore((s) => s.createMultilink);
  const getMultilink = useStore((s) => s.getMultilink);
  const user = useStore((s) => s.user);
  const { userId } = useAuth();

  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateMultilinkValues>({
    resolver: zodResolver(createMultilinkSchema),
    defaultValues: {
      title: "",
      slug: "",
      language: "Русский",
      type: "self",
    },
  });

  const type = watch("type");

  const onSubmit = async (values: CreateMultilinkValues) => {
    setSubmitError("");

    // Клиентская проверка лимита тарифа: прямой переход на /multilink/create
    // не должен обходить лимит (кнопка на дашборде лишь отключается).
    const limit = TARIFF_LIMITS[user.tariff];
    if (user.multilinks.length >= limit) {
      setSubmitError("Достигнут лимит визиток для вашего тарифа");
      return;
    }

    // Определяем итоговый slug: пользовательский проверяем на занятость,
    // автоматический генерируем и повторяем при коллизии.
    let slug = (values.slug || "").trim();
    if (slug) {
      try {
        if (await isSlugTaken(slug)) {
          setSubmitError("Этот адрес уже занят, выберите другой");
          return;
        }
      } catch {
        /* база недоступна — пропускаем проверку занятости */
      }
    } else {
      slug = generateSlug();
      try {
        let attempt = 0;
        while ((await isSlugTaken(slug)) && attempt < 5) {
          slug = generateSlug();
          attempt += 1;
        }
      } catch {
        /* база недоступна — используем сгенерированный slug */
      }
    }

    const id = createMultilink({
      title: values.title,
      slug,
      language: values.language,
      type: values.type,
    });
    // Пустой id — стор отказал (лимит тарифа); подстраховка на случай обхода.
    if (!id) {
      setSubmitError("Достигнут лимит визиток для вашего тарифа");
      return;
    }

    // Сразу заводим карту в базе, чтобы она была доступна на всех устройствах.
    const created = getMultilink(id);
    if (created && userId) {
      try {
        await saveCard(userId, {
          slug: created.slug,
          type: created.type,
          data: created.settings,
        });
      } catch (e: any) {
        // Ошибку показываем пользователю, а не проглатываем.
        setSubmitError(
          e?.message
            ? `Не удалось сохранить визитку в базе: ${e.message}`
            : "Не удалось сохранить визитку в базе. Проверьте соединение и попробуйте снова."
        );
        return;
      }
    }
    router.push(`/multilink/${id}/edit`);
  };

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        Назад
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Новая мультиссылка</h1>
        <p className="mt-1 text-sm text-slate-400">
          Заполните основные параметры — детали визитки настроите на следующем
          шаге.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <SectionCard>
          <div className="space-y-5">
            <Field
              label="Название визитки (для себя)"
              required
              hint="Видно только вам — помогает отличать визитки в списке."
              error={errors.title?.message}
            >
              <Input
                placeholder="Например, Визитка для мероприятий"
                {...register("title")}
              />
            </Field>

            <Field
              label="Короткая ссылка (URL)"
              hint="Оставьте пустым — сгенерируем случайный адрес автоматически."
              error={errors.slug?.message}
            >
              <div className="flex items-stretch overflow-hidden rounded-lg border border-white/12 focus-within:border-brand-light focus-within:ring-2 focus-within:ring-brand-blue/25">
                <span className="flex select-none items-center whitespace-nowrap border-r border-white/12 bg-night-900/50 px-3 text-sm text-slate-400">
                  selfcards.ru/p/
                </span>
                <input
                  placeholder="ваш-адрес"
                  className="h-11 w-full bg-night-900/40 px-3 text-base text-white placeholder:text-slate-500 focus:outline-none"
                  {...register("slug")}
                />
              </div>
            </Field>

            <Field label="Язык по умолчанию" error={errors.language?.message}>
              <Select {...register("language")}>
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-200">Выберите тип</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TypeOption
                  active={type === "self"}
                  icon={<UserIcon size={18} />}
                  title="Нетворкинг"
                  text="Личная визитка с вашими контактами и ссылками."
                  onClick={() => setValue("type", "self")}
                />
                <TypeOption
                  active={type === "offline"}
                  icon={<Building2 size={18} />}
                  title="Офлайн точка"
                  text="Визитка заведения, отдела или места."
                  onClick={() => setValue("type", "offline")}
                />
              </div>
              <input type="hidden" {...register("type")} />
            </div>
          </div>
        </SectionCard>

        {submitError && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {submitError}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Link href="/">
            <Button type="button" variant="secondary">
              Отмена
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Check size={16} />
            Создать
          </Button>
        </div>
      </form>
    </div>
  );
}

function TypeOption({
  active,
  icon,
  title,
  text,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
        active
          ? "border-brand-light bg-brand-blue/10 shadow-glow"
          : "border-white/10 bg-white/5 hover:border-white/25"
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-brand-gradient text-white" : "bg-white/10 text-slate-300"
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
          {text}
        </span>
      </span>
    </button>
  );
}
