"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AtSign,
  Building2,
  Check,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Play,
  Send,
  Share2,
  Star,
  UserPlus,
  Wifi,
  Youtube,
} from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import {
  buildVCard,
  cn,
  downloadFile,
  normalizeSettings,
  normalizeUrl,
} from "@/lib/utils";
import type { Multilink, BusinessInfo } from "@/types";

export default function PreviewPage() {
  const params = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const multilink = useStore((s) =>
    s.user.multilinks.find((m) => m.id === params.id)
  );
  const isBusiness = useStore((s) => s.user.tariff === "Бизнес");

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-sm">
        <div className="h-[560px] animate-pulse rounded-3xl border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (!multilink) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="text-sm text-slate-300">Визитка не найдена.</p>
        <Link
          href="/"
          className="mt-3 inline-block text-sm font-medium text-brand-light underline"
        >
          На главную
        </Link>
      </div>
    );
  }

  return <CardView multilink={multilink} isBusiness={isBusiness} />;
}

function CardView({
  multilink,
  isBusiness,
}: {
  multilink: Multilink;
  isBusiness: boolean;
}) {
  const s = normalizeSettings(multilink.settings);
  const c = s.contacts;
  const b = s.business;
  const isOffline = multilink.type === "offline";
  const [shared, setShared] = useState(false);

  const displayName = isOffline
    ? b?.name || s.name || multilink.title
    : s.name || c.personal.name || multilink.title;

  const subtitle = isOffline
    ? b?.address || ""
    : [c.work.position, c.work.company].filter(Boolean).join(" · ");

  // Логотип и фон отображаются только на тарифе «Бизнес».
  const logo = isBusiness ? s.logo : undefined;
  const background = isBusiness ? s.background : undefined;

  const handleSaveContact = () => {
    downloadFile(
      `${displayName || "contact"}.vcf`,
      buildVCard(multilink),
      "text/vcard;charset=utf-8"
    );
  };

  const handleShare = async () => {
    const url =
      typeof window !== "undefined"
        ? window.location.origin + `/preview/${multilink.id}`
        : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: displayName, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* пользователь отменил — игнорируем */
    }
  };

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hasWork =
    c.work.company ||
    c.work.position ||
    c.work.phone ||
    c.work.email ||
    c.work.website ||
    c.work.customButtons.length > 0;

  const socials = [
    c.social.telegram && {
      icon: <Send size={17} />,
      label: "Telegram",
      href: `https://t.me/${c.social.telegram.replace(/^@/, "")}`,
    },
    c.social.messenger && {
      icon: <MessageCircle size={17} />,
      label: "Мессенджер",
      href: `tel:${c.social.messenger}`,
    },
    c.social.vk && {
      icon: <AtSign size={17} />,
      label: "VK",
      href: `https://vk.com/${c.social.vk}`,
    },
    c.social.youtube && {
      icon: <Youtube size={17} />,
      label: "YouTube",
      href: `https://youtube.com/${c.social.youtube}`,
    },
    c.social.rutube && {
      icon: <Play size={17} />,
      label: "Rutube",
      href: normalizeUrl(c.social.rutube),
    },
    c.social.max && {
      icon: <MessageCircle size={17} />,
      label: "MAX",
      href: normalizeUrl(c.social.max),
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; href: string }[];

  const showAction =
    c.actionButton.label && c.actionButton.label !== "Не использовать";

  return (
    <div className="mx-auto max-w-sm">
      <div className="glass-strong overflow-hidden rounded-3xl shadow-pop">
        {/* Шапка визитки */}
        <div className="relative px-6 pb-6 pt-10 text-center">
          {/* Фон (бизнес) */}
          {background ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={background}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-night-900/60 to-night-900/90" />
            </>
          ) : (
            <div className="absolute inset-0 bg-brand-gradient opacity-90" />
          )}

          <div className="relative">
            <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/95 text-2xl font-bold text-night-900 shadow-lg">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials || "SC"
              )}
            </div>
            <h1 className="mt-4 text-xl font-bold text-white drop-shadow">
              {displayName || "Название"}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-100/90 drop-shadow">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6 px-5 py-6">
          {/* Кнопка действия */}
          {showAction && (
            <a
              href={normalizeUrl(c.actionButton.url) || "#"}
              target="_blank"
              rel="noreferrer"
              className="btn-grad flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold"
            >
              {c.actionButton.label}
            </a>
          )}

          {isOffline ? (
            <OfflineSections b={b} />
          ) : (
            <>
          {/* Личные контакты */}
          <Section title="Личные контакты">
            <ContactRow
              icon={<Phone size={16} />}
              value={c.personal.phone}
              href={`tel:${c.personal.phone}`}
            />
            <ContactRow
              icon={<Mail size={16} />}
              value={c.personal.email}
              href={`mailto:${c.personal.email}`}
            />
            <ContactRow
              icon={<Globe size={16} />}
              value={c.personal.website}
              href={normalizeUrl(c.personal.website)}
            />
            {c.personal.customButtons.map((b) => (
              <LinkButton key={b.id} label={b.label} href={normalizeUrl(b.url)} />
            ))}
          </Section>

          {/* Рабочие контакты */}
          {hasWork && (
            <Section title="Рабочие контакты">
              <ContactRow icon={<Building2 size={16} />} value={c.work.company} />
              <ContactRow
                icon={<Phone size={16} />}
                value={c.work.phone}
                href={`tel:${c.work.phone}`}
              />
              <ContactRow
                icon={<Mail size={16} />}
                value={c.work.email}
                href={`mailto:${c.work.email}`}
              />
              <ContactRow
                icon={<Globe size={16} />}
                value={c.work.website}
                href={normalizeUrl(c.work.website)}
              />
              {c.work.customButtons.map((b) => (
                <LinkButton
                  key={b.id}
                  label={b.label}
                  href={normalizeUrl(b.url)}
                />
              ))}
            </Section>
          )}
            </>
          )}

          {/* Соцсети */}
          {socials.length > 0 && (
            <Section title={isOffline ? "Мессенджеры" : "Соцсети и мессенджеры"}>
              <div className="grid grid-cols-4 gap-3">
                {socials.map((soc) => (
                  <a
                    key={soc.label}
                    href={soc.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-brand-light transition-colors hover:border-brand-light">
                      {soc.icon}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {soc.label}
                    </span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Обо мне / О заведении */}
          {c.about && (
            <Section title={isOffline ? "О заведении" : "Обо мне"}>
              <p className="text-sm leading-relaxed text-slate-300">{c.about}</p>
            </Section>
          )}

          {/* Действия */}
          <div className="space-y-2 pt-2">
            <Button className="w-full" onClick={handleSaveContact}>
              <UserPlus size={16} />
              Сохранить в контакты
            </Button>
            <Button variant="secondary" className="w-full" onClick={handleShare}>
              {shared ? <Check size={16} /> : <Share2 size={16} />}
              {shared ? "Ссылка скопирована" : "Поделиться"}
            </Button>
          </div>

          {/* Футер */}
          <div className="flex items-center justify-center gap-1.5 border-t border-white/10 pt-5 text-xs text-slate-400">
            <Logo showText className="scale-90" />
            <span>· selfcard.site</span>
          </div>
        </div>
      </div>

      <div className="mt-5 text-center">
        <Link
          href={`/multilink/${multilink.id}/edit`}
          className="text-sm font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline"
        >
          Вернуться к редактированию
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ContactRow({
  icon,
  value,
  href,
}: {
  icon: React.ReactNode;
  value?: string;
  href?: string;
}) {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 transition-colors hover:border-white/25">
      <span className="text-brand-light">{icon}</span>
      <span className="truncate text-sm text-slate-100">{value}</span>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="block">
      {content}
    </a>
  ) : (
    content
  );
}

function LinkButton({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon?: React.ReactNode;
}) {
  if (!label) return null;
  return (
    <a
      href={href || "#"}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 text-sm font-medium text-white transition-colors hover:border-brand-light"
      )}
    >
      {icon && <span className="text-brand-light">{icon}</span>}
      {label}
    </a>
  );
}

/** Секции визитки-заведения (тип «Офлайн точка»). */
function OfflineSections({ b }: { b: BusinessInfo }) {
  return (
    <>
      {(b.hours || b.address) && (
        <Section title="Информация">
          {b.hours && (
            <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
              <Clock size={16} className="mt-0.5 shrink-0 text-brand-light" />
              <span className="whitespace-pre-line text-sm text-slate-100">
                {b.hours}
              </span>
            </div>
          )}
          {b.address && <ContactRow icon={<MapPin size={16} />} value={b.address} />}
        </Section>
      )}

      {(b.yandexMaps || b.gis2) && (
        <Section title="Как добраться">
          {b.yandexMaps && (
            <LinkButton
              label="Яндекс.Карты"
              href={normalizeUrl(b.yandexMaps)}
              icon={<Navigation size={15} />}
            />
          )}
          {b.gis2 && (
            <LinkButton
              label="2ГИС"
              href={normalizeUrl(b.gis2)}
              icon={<MapPin size={15} />}
            />
          )}
        </Section>
      )}

      {(b.wifiName || b.wifiPassword) && (
        <Section title="Wi-Fi для гостей">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
            <div className="flex items-center gap-3">
              <Wifi size={16} className="text-brand-light" />
              <span className="text-sm text-slate-100">{b.wifiName || "—"}</span>
            </div>
            {b.wifiPassword && (
              <p className="mt-1.5 pl-7 text-sm text-slate-300">
                Пароль:{" "}
                <span className="font-semibold text-white">
                  {b.wifiPassword}
                </span>
              </p>
            )}
          </div>
        </Section>
      )}

      {b.reviewLink && (
        <a
          href={normalizeUrl(b.reviewLink)}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 text-sm font-semibold text-white transition-colors hover:border-brand-light"
        >
          <Star size={16} className="text-brand-light" />
          Оставить отзыв
        </a>
      )}
    </>
  );
}
