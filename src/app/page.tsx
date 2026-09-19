"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  Eye,
  Lightbulb,
  Link2,
  Nfc,
  Pencil,
  Plus,
  QrCode,
  Repeat,
  Settings2,
  Ticket,
  Trash2,
  X,
} from "lucide-react";

import { AuthGuard } from "@/components/AuthGuard";
import { SectionCard, Modal } from "@/components/ui/Card";
import { QrModal } from "@/components/QrModal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { useAuth } from "@/components/AuthProvider";
import { fetchMyCards, saveCard, deleteCard } from "@/lib/cards";
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
  const { userId } = useAuth();
  const applyPromo = useStore((s) => s.applyPromo);
  const setName = useStore((s) => s.setName);
  const setMultilinks = useStore((s) => s.setMultilinks);
  const deleteMultilink = useStore((s) => s.deleteMultilink);
  const addRedirect = useStore((s) => s.addRedirect);
  const deleteRedirect = useStore((s) => s.deleteRedirect);
  const addNfcDevice = useStore((s) => s.addNfcDevice);
  const deleteNfcDevice = useStore((s) => s.deleteNfcDevice);

  // Синхронизация карт с базой. База — источник правды: сначала берём карты
  // из базы, а вверх заливаем только те локальные, которых в базе ещё нет
  // (чтобы устаревшая локальная копия не перезаписала свежую версию из базы).
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || !userId || syncedRef.current) return;
    syncedRef.current = true;
    (async () => {
      try {
        const local = useStore.getState().user.multilinks;
        const dbCards = await fetchMyCards(userId);
        const dbSlugs = new Set(dbCards.map((c) => c.slug));
        const localOnly = local.filter((m) => !dbSlugs.has(m.slug));
        for (const m of localOnly) {
          try {
            await saveCard(userId, {
              slug: m.slug,
              type: m.type,
              data: m.settings,
            });
          } catch {
            /* пропускаем отдельную карту */
          }
        }
        setMultilinks([...dbCards, ...localOnly]);
      } catch {
        /* база недоступна — работаем на локальных данных */
      }
    })();
  }, [hydrated, userId, setMultilinks]);

  const handleDeleteMultilink = async (slug: string, id: string) => {
    if (!window.confirm("Удалить визитку? Это действие необратимо.")) return;
    try {
      await deleteCard(slug);
    } catch {
      /* если в базе нет — не страшно */
    }
    deleteMultilink(id);
  };

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

  const [qrCard, setQrCard] = useState<{ slug: string; title: string } | null>(
    null
  );

  const limit = TARIFF_LIMITS[user.tariff];
  const usageLabel = limit === Infinity ? "∞" : String(limit);
  const limitReached = user.multilinks.length >= limit;
  const totalViews = user.multilinks.reduce((s, m) => s + (m.views ?? 0), 0);
  const nfcCount = user.nfcDevices.length;

  const [tipHidden, setTipHidden] = useState(false);
  useEffect(() => {
    try {
      setTipHidden(localStorage.getItem("sc_tip_hidden") === "1");
    } catch {}
  }, []);
  const hideTip = () => {
    setTipHidden(true);
    try {
      localStorage.setItem("sc_tip_hidden", "1");
    } catch {}
  };

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
    <div className="space-y-5">
      {/* Верхняя панель (дашборд) */}
      <div className="glass rounded-2xl px-5 py-5 shadow-card sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-400">Личный кабинет</p>
            {!editingName ? (
              <div className="mt-0.5 flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-white">
                  {hydrated ? displayName : "…"}
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
          <Link href="/profile" className="shrink-0">
            <span className="inline-flex items-center rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-bold text-white">
              {hydrated ? user.tariff : "…"}
            </span>
          </Link>
        </div>

        {/* Статистика */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <StatCard
            value={hydrated ? String(user.multilinks.length) : "…"}
            sub={`/ ${usageLabel}`}
            label="Визитки"
          />
          <StatCard
            value={hydrated ? String(totalViews) : "…"}
            label="Просмотров"
          />
          <StatCard
            value={hydrated ? String(nfcCount) : "…"}
            label="Носители"
          />
        </div>

        {/* Промокод */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Ticket
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder="Промокод"
              className="pl-9"
              onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
            />
          </div>
          <Button onClick={handleApplyPromo} className="shrink-0">
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

      {/* Подсказка (сворачиваемая) */}
      {hydrated && !tipHidden && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-light/25 bg-gradient-to-br from-brand-blue/10 to-brand-purple/10 px-4 py-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Lightbulb size={17} />
          </span>
          <p className="text-[13px] leading-snug text-slate-300">
            <span className="font-semibold text-white">
              Настройте визитку:
            </span>{" "}
            соберите все ссылки в мультиссылку или направьте NFC напрямую.
          </p>
          <button
            onClick={hideTip}
            aria-label="Скрыть подсказку"
            className="ml-auto shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Мультиссылки */}
      <SectionCard
        title="Ваши визитки"
        description="Страницы со всеми вашими ссылками."
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
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/20">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
                      <Link2 size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {m.title}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        app.selfcards.ru/p/{m.slug}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-brand-light">
                      <Eye size={13} />
                      {m.views ?? 0}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={`/multilink/${m.id}/edit`}
                      className="flex-1"
                    >
                      <Button variant="secondary" size="sm" className="w-full">
                        <Settings2 size={15} />
                        Настроить
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="QR-код"
                      onClick={() =>
                        setQrCard({ slug: m.slug, title: m.title })
                      }
                    >
                      <QrCode size={16} />
                    </Button>
                    <Link href={`/p/${m.slug}`} target="_blank">
                      <Button variant="ghost" size="sm" aria-label="Открыть визитку">
                        <ExternalLink size={16} />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Удалить"
                      onClick={() => handleDeleteMultilink(m.slug, m.id)}
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
                    onClick={() => {
                      if (window.confirm("Удалить переадресацию?"))
                        deleteRedirect(r.id);
                    }}
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
        title="NFC-носители"
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
                    onClick={() => {
                      if (window.confirm("Отвязать это NFC-устройство?"))
                        deleteNfcDevice(n.id);
                    }}
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

      {/* Модалка QR-кода */}
      <QrModal
        open={qrCard !== null}
        onClose={() => setQrCard(null)}
        url={qrCard ? `https://app.selfcards.ru/p/${qrCard.slug}` : ""}
        title={qrCard?.title}
      />
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

function StatCard({
  value,
  sub,
  label,
}: {
  value: string;
  sub?: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-baseline gap-1">
        <span className="bg-brand-gradient bg-clip-text text-[26px] font-extrabold leading-none tracking-tight text-transparent tabular-nums">
          {value}
        </span>
        {sub && <span className="text-sm font-bold text-slate-500">{sub}</span>}
      </div>
      <div className="mt-1.5 text-xs text-slate-400">{label}</div>
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
