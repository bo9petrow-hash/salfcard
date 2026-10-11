import { NextResponse, type NextRequest } from "next/server";

/**
 * selfcards.ru и www.selfcards.ru — короткие адреса магазина.
 * Раньше их перенаправлял Cloudflare, который в России без VPN работает
 * медленно или не открывается. Теперь эти домены можно направить прямо на
 * это приложение (Timeweb, Россия), а оно сразу отправит посетителя
 * в магазин shop.selfcards.ru. Для app.selfcards.ru ничего не меняется.
 */
const SHOP_HOSTS = new Set(["selfcards.ru", "www.selfcards.ru"]);

export function middleware(req: NextRequest) {
  const raw = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const host = raw.split(",")[0].trim().split(":")[0].toLowerCase();
  if (SHOP_HOSTS.has(host)) {
    const { pathname, search } = req.nextUrl;
    // Главную отдаём как /index.html: CDN магазина отвечает 403 на «/» с длинными
    // метками в адресе (например, yclid из Яндекс Рекламы), а /index.html — нормально.
    const path = pathname === "/" ? "/index.html" : pathname;
    return NextResponse.redirect(`https://shop.selfcards.ru${path}${search}`, 301);
  }
  return NextResponse.next();
}

export const config = {
  // Статику Next.js не трогаем — на неё короткие домены никогда не ведут.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
