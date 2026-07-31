"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Trash2, UserRound } from "lucide-react";

import { AuthGuard } from "@/components/AuthGuard";
import { SectionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { fileToDataUrl, cn } from "@/lib/utils";
import type { Tariff } from "@/types";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <Profile />
    </AuthGuard>
  );
}

function Profile() {
  const hydrated = useHydrated();
  const user = useStore((s) => s.user);
  const setName = useStore((s) => s.setName);
  const setAvatar = useStore((s) => s.setAvatar);
  const setTariff = useStore((s) => s.setTariff);

  const [nameDraft, setNameDraft] = useState(user.name || "");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isBusiness = user.tariff === "Бизнес";

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setAvatar(dataUrl);
    e.target.value = "";
  };

  const handleSave = () => {
    setName(nameDraft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const chooseTariff = (t: Tariff) => setTariff(t);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Личный кабинет</h1>
        <p className="mt-1 text-sm text-slate-400">
          Управляйте профилем, тарифом и аватаром.
        </p>
      </div>

      {/* Профиль */}
      <SectionCard title="Профиль">
        <div className="space-y-5">
          {/* Аватар */}
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5">
              {hydrated && user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar}
                  alt="Аватар"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-500">
                  <UserRound size={30} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus size={15} />
                  Загрузить аватар
                </Button>
                {hydrated && user.avatar && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAvatar(undefined)}
                  >
                    <Trash2 size={15} />
                    Убрать
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isBusiness
                  ? "Аватар отображается на вашей визитке."
                  : "На визитке аватар доступен в тарифе «Бизнес»."}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickAvatar}
              />
            </div>
          </div>

          {/* Email */}
          <Field label="Email" hint="Используется для входа в систему.">
            <Input
              value={hydrated ? user.email || "" : ""}
              readOnly
              disabled
              placeholder="—"
            />
          </Field>

          {/* Имя */}
          <Field
            label="Имя"
            hint="Отображается в приветствии на главной странице."
          >
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Например, Иван"
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave}>
              <Check size={16} />
              Сохранить
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-brand-light">
                <Check size={15} />
                Сохранено
              </span>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Тариф */}
      <SectionCard
        title="Тариф"
        description="Переключение доступных возможностей."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TariffOption
            title="Базовый"
            features={["До 2 мультиссылок", "Базовые блоки визитки"]}
            active={hydrated && user.tariff === "Базовый"}
            onClick={() => chooseTariff("Базовый")}
          />
          <TariffOption
            title="Бизнес"
            features={[
              "Безлимит мультиссылок",
              "Логотип и фон визитки",
              "Аватар на визитке",
            ]}
            active={hydrated && user.tariff === "Бизнес"}
            onClick={() => chooseTariff("Бизнес")}
            highlight
          />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          В демо-версии тариф переключается вручную. Промокод на главной
          активирует «Бизнес» автоматически.
        </p>
      </SectionCard>
    </div>
  );
}

function TariffOption({
  title,
  features,
  active,
  highlight,
  onClick,
}: {
  title: string;
  features: string[];
  active: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors",
        active
          ? "border-brand-light bg-brand-blue/10 shadow-glow"
          : "border-white/10 bg-white/5 hover:border-white/25"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{title}</span>
        {active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-2.5 py-0.5 text-[11px] font-semibold text-white">
            <Check size={12} />
            Активен
          </span>
        ) : (
          highlight && (
            <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-slate-300">
              Рекомендуем
            </span>
          )
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-1.5 text-xs text-slate-300">
            <Check size={13} className="text-brand-light" />
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}
