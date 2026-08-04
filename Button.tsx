"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  Link2,
  Nfc,
  Pencil,
  PlayCircle,
  Plus,
  Repeat,
  Settings2,
  Ticket,
  Trash2,
  X,
} from "lucide-react";

import { AuthGuard } from "@/components/AuthGuard";
import { SectionCard, Modal } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { TARIFF_LIMITS } from "@/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}

function Dashboard() {
  const hydrated = useHydrated();
  const user = useStore((s) => s.user);
  const applyPromo = useStore((s) => s.applyPromo);
  const setName = useStore((s) => s.setName);
  const deleteMultilink = useStore((s) => s.deleteMultilink);
  const addRedirect = useStore((s) => s.addRedirect);
  const deleteRedirect = useStore((s) => s.deleteRedirect);
  const addNfcDevice = useStore((s) => s.addNfcDevice);
  const deleteNfcDevice = useStore((s) => s.deleteNfcDevice);

  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const [redirectOpen, setRedirectOpen] = useState(false);
  const [redirectForm, setRedirectForm] = useState({ title: "", url: "" });

  const [nfcOpen, setNfcOpen] = useState(false);
  const [nfcName, setNfcName] = useState("");

  const limit = TARIFF_LIMITS[user.tariff];
  const usageLabel = limit === Infinity ? "∞" : String(limit);
  const limitReached = user.multilinks.length >= limit;

  // Приветствие: имя, иначе email, иначе «Пользователь».
  const displayName = user.name?.trim() || user.email || "Пользователь";

  const handleApplyPromo = () => {
    const res = applyPromo(promo);
    setPromoMsg({ ok: res.ok, text: res.message });
    if (res.ok) setPromo("");
  };

  const startEditName = () => {
    setNameDraft(user.name || "");
    setEditingName(true);
  };
  const saveName = () => {
    setName(nameDraft);
    setEditingName(false);
  };

  const submitRedirect = () => {
    if (!redirectForm.title.trim() || !redirectForm.url.trim()) return;
    addRedirect(redirectForm.title.trim(), redirectForm.url.trim());
    setRedirectForm({ title: "", url: "" });
    setRedirectOpen(false);
  };

  const submitNfc = () => {
    if (!nfcName.trim()) return;
    addNfcDevice(nfcName.trim());
    setNfcName("");
    setNfcOpen(false);
  };

  const multilinkTitle = (id?: string) =>
    user.multilinks.find((m) => m.id === id)?.title;

  return (
    <div className="space-y-6">
      {/* Верхняя панель */}
      <div className="glass overflow-hidden rounded-2xl shadow-card">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-400">Добро пожаловать</p>
              {!editingName ? (
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-white">
                    Привет, {hydrated ? displayName : "…"}
                  </h1>
                  {hydrated && (
                    <button
                      onClick={startEditName}
                      aria-label="Изменить имя"
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Ваше имя"
                    className="h-9 w-44"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                  />
                  <Button size="sm" onClick={saveName}>
                    <Check size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingName(false)}
                    aria-label="Отмена"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/profile">
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10">
                  Тариф: {hydrated ? user.tariff : "…"}
                </span>
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white">
                <Link2 size={13} />
                {hydrated ? user.multilinks.length : 0} / {usageLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Промокод */}
        <div className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field
                label="Промокод"
                hint="Введите промокод, чтобы активировать возможности тарифа «Бизнес»."
              >
                <div className="relative">
                  <Ticket
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                    placeholder="Например, SELFCARD"
                    className="pl-9"
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                  />
                </div>
              </Field>
            </div>
            <Button onClick={handleApplyPromo} className="sm:mb-[2px]">
              Применить
            </Button>
          </div>
          {promoMsg && (
            <p
              className={cn(
                "mt-2 flex items-center gap-1.5 text-sm",
                promoMsg.ok ? "text-brand-light" : "text-red-400"
              )}
            >
              {promoMsg.ok && <Check size={15} />}
              {promoMsg.text}
            </p>
          )}
        </div>
      </div>

      {/* Инструкция */}
      <SectionCard title="Как настроить вашу визитку?">
        <div className="grid gap-4 sm:grid-cols-2">
          <InstructionStep
            icon={<Link2 size={18} />}
            step="Вариант 1"
            title="Мультиссылка"
            text="Соберите все контакты и ссылки на одной странице-визитке и поделитесь ей одним касанием."
          />
          <InstructionStep
            icon={<Repeat size={18} />}
            step="Вариант 2"
            title="Переадресация"
            text="Направьте NFC-носитель сразу на нужный адрес: сайт, профиль или чат."
          />
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-light underline-offset-4 hover:underline"
        >
          <PlayCircle size={18} />
          Смотреть видеоинструкцию
        </a>
      </SectionCard>

      {/* Мультиссылки */}
      <SectionCard
        title="Мультиссылки"
        description="Страницы-визитки со всеми вашими ссылками."
        action={
          <Link
            href="/multilink/create"
            aria-disabled={limitReached}
            className={limitReached ? "pointer-events-none" : ""}
            tabIndex={limitReached ? -1 : undefined}
          >
            <Button size="sm" disabled={limitReached}>
              <Plus size={16} />
              Создать
            </Button>
          </Link>
        }
      >
        {!hydrated ? (
          <Placeholder />
        ) : user.multilinks.length === 0 ? (
          <EmptyState text="У вас пока нет созданных мультиссылок." />
        ) : (
          <ul className="space-y-2">
            {user.multilinks.map((m) => (
              <li key={m.id}>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:border-white/20">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gradient text-white">
                    <Link2 size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {m.title}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      selfcard.ru/p/{m.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/preview/${m.id}`} target="_blank">
                      <Button variant="ghost" size="sm" aria-label="Просмотр">
                        <ExternalLink size={16} />
                      </Button>
                    </Link>
                    <Link href={`/multilink/${m.id}/edit`}>
                      <Button variant="secondary" size="sm">
                        Настроить
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Удалить"
                      onClick={() => deleteMultilink(m.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {hydrated && limitReached && (
          <p className="mt-3 text-xs text-slate-400">
            Достигнут лимит тарифа «{user.tariff}». Активируйте «Бизнес»
            промокодом, чтобы создавать больше мультиссылок.
          </p>
        )}
      </SectionCard>

      {/* Переадресация */}
      <SectionCard
        title="Переадресация"
        description="Прямое перенаправление NFC-носителя на нужный адрес."
        action={
          <Button size="sm" onClick={() => setRedirectOpen(true)}>
            <Plus size={16} />
            Добавить
          </Button>
        }
      >
        {!hydrated ? (
          <Placeholder />
        ) : user.redirects.length === 0 ? (
          <EmptyState text="Нет созданных переадресаций. Создайте первую!" />
        ) : (
          <ul className="space-y-2">
            {user.redirects.map((r) => (
              <li key={r.id}>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-brand-light">
                    <Repeat size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {r.title}
                    </p>
                    <p className="truncate text-xs text-slate-400">{r.url}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Удалить"
                    onClick={() => deleteRedirect(r.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* NFC Носители */}
      <SectionCard
        title="NFC Носители"
        description="Карты, брелоки и стикеры, привязанные к вашим страницам."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/nfc">
              <Button size="sm" variant="secondary">
                <Settings2 size={15} />
                Управлять
              </Button>
            </Link>
            <Button size="sm" onClick={() => setNfcOpen(true)}>
              <Plus size={16} />
              Добавить
            </Button>
          </div>
        }
      >
        {!hydrated ? (
          <Placeholder />
        ) : user.nfcDevices.length === 0 ? (
          <EmptyState text="Здесь появятся ваши NFC-носители." />
        ) : (
          <ul className="space-y-2">
            {user.nfcDevices.map((n) => (
              <li key={n.id}>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-brand-light">
                    <Nfc size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {n.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {n.multilinkId
                        ? `Привязана: ${multilinkTitle(n.multilinkId) ?? "—"}`
                        : "Не привязана"}
                    </p>
                  </div>
                  <StatusBadge active={n.status === "active"} />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Удалить"
                    onClick={() => deleteNfcDevice(n.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Модалка переадресации */}
      <Modal
        open={redirectOpen}
        onClose={() => setRedirectOpen(false)}
        title="Новая переадресация"
      >
        <div className="space-y-4">
          <Field label="Название" required>
            <Input
              value={redirectForm.title}
              onChange={(e) =>
                setRedirectForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Например, Мой Telegram"
            />
          </Field>
          <Field label="Ссылка для переадресации" required>
            <Input
              value={redirectForm.url}
              onChange={(e) =>
                setRedirectForm((f) => ({ ...f, url: e.target.value }))
              }
              placeholder="https://t.me/username"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setRedirectOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitRedirect}>
              <Plus size={16} />
              Добавить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модалка NFC */}
      <Modal
        open={nfcOpen}
        onClose={() => setNfcOpen(false)}
        title="Новый NFC-носитель"
      >
        <div className="space-y-4">
          <Field label="Название носителя" required>
            <Input
              value={nfcName}
              onChange={(e) => setNfcName(e.target.value)}
              placeholder="Например, Моя визитка NFC"
              onKeyDown={(e) => e.key === "Enter" && submitNfc()}
            />
          </Field>
          <p className="text-xs text-slate-400">
            Привязать мультиссылку и активировать метку можно на странице
            «Управлять».
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setNfcOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitNfc}>
              <Plus size={16} />
              Добавить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        active
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-white/10 text-slate-400"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-400" : "bg-slate-500"
        )}
      />
      {active ? "Активен" : "Не активен"}
    </span>
  );
}

function InstructionStep({
  icon,
  step,
  title,
  text,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {step}
        </span>
      </div>
      <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-white">
        {title}
        <ArrowUpRight size={15} className="text-brand-light" />
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">{text}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function Placeholder() {
  return (
    <div className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/5" />
  );
}
