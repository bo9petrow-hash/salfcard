"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Globe,
  LogOut,
  Menu,
  Nfc,
  Send,
  Settings,
  User as UserIcon,
} from "lucide-react";

import { Logo } from "@/components/Logo";
import { useStore } from "@/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { useAuth } from "@/components/AuthProvider";

const MENU_ITEMS = [
  { label: "Личный кабинет", href: "/profile", icon: UserIcon, external: false },
  { label: "Настройки", href: "/settings", icon: Settings, external: false },
  { label: "NFC-носители", href: "/nfc", icon: Nfc, external: false },
  {
    label: "Сайт selfcard.ru",
    href: "https://selfcard.ru",
    icon: Globe,
    external: true,
  },
  {
    label: "Телеграм-канал @salfcard",
    href: "https://t.me/salfcard",
    icon: Send,
    external: true,
  },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const logout = useStore((s) => s.logout);
  const { email, signOut } = useAuth();
  const isAuthenticated = Boolean(email);
  const avatar = useStore((s) => s.user.avatar);

  // На экранах входа/регистрации и на публичной визитке шапка не нужна.
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/p/");

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await signOut();
    logout();
    setOpen(false);
    router.push("/login");
  };

  if (isAuthPage) return null;

  return (
    <header className="relative z-40 border-b border-white/10 bg-night-900">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="На главную">
          <Logo />
        </Link>

        {/* Меню показываем только авторизованному пользователю */}
        {hydrated && isAuthenticated && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="glass inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt="Аватар"
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <Menu size={18} />
              )}
              <span className="hidden sm:inline">Меню</span>
            </button>

            {open && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-night-800 py-1.5 shadow-pop"
              >
                {MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <span className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white">
                      <Icon size={17} className="text-brand-light" />
                      {item.label}
                    </span>
                  );
                  return item.external ? (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setOpen(false)}
                    >
                      {content}
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                    >
                      {content}
                    </Link>
                  );
                })}

                <div className="my-1.5 h-px bg-white/10" />

                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <LogOut size={17} className="text-brand-light" />
                  Выйти
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
