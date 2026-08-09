import type { MetadataRoute } from "next";

const SITE = "https://selfcards.ru";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Личные и служебные разделы прятать от индексации.
      disallow: ["/login", "/register", "/reset-password", "/multilink/", "/preview/", "/profile", "/nfc", "/settings"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
