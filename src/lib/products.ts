/**
 * Каталог товаров и цены — ИСТОЧНИК ПРАВДЫ на сервере.
 *
 * Сумму заказа всегда считает сервер по этому списку, а НЕ по сумме из браузера —
 * иначе покупатель мог бы подменить цену в запросе и оплатить, например, 1 ₽.
 * Если меняешь цены на сайте — поменяй и здесь (и TIERS в магазине: store/*.html).
 */
export interface Product {
  sku: string;
  title: string;
  price: number; // ₽ за штуку (розница, 1 шт.)
  family?: keyof typeof TIERS; // линейка с оптовыми ценами
}

/**
 * Оптовые цены за штуку. Скидка считается по общему количеству товаров одной
 * линейки в заказе (например, 3 чёрных + 2 белых фирменных = 5 шт.).
 * [от скольких штук, цена за штуку]
 */
export const TIERS = {
  brand: [[1, 3790], [5, 3390], [10, 3190], [20, 2990], [50, 2790]],
  rev: [[1, 4790], [5, 4290], [10, 3990], [20, 3790], [50, 3490]],
} as const;

export const PRODUCTS: Record<string, Product> = {
  card_black_basic: { sku: "card_black_basic", title: "Визитка «Базовый» (чёрная)", price: 1590 },
  card_white_basic: { sku: "card_white_basic", title: "Визитка «Базовый» (белая)", price: 1590 },
  card_black_business: { sku: "card_black_business", title: "Визитка «Бизнес» (чёрная)", price: 1890 },
  card_white_business: { sku: "card_white_business", title: "Визитка «Бизнес» (белая)", price: 1890 },
  tent_black: { sku: "tent_black", title: "Фирменный тейбл-тент (чёрный)", price: 3790, family: "brand" },
  tent_white: { sku: "tent_white", title: "Фирменный тейбл-тент (белый)", price: 3790, family: "brand" },
  rev_ya_black: { sku: "rev_ya_black", title: "Тейбл-тент «Отзывы на картах» Яндекс Карты (чёрный)", price: 4790, family: "rev" },
  rev_ya_white: { sku: "rev_ya_white", title: "Тейбл-тент «Отзывы на картах» Яндекс Карты (белый)", price: 4790, family: "rev" },
  rev_gis_black: { sku: "rev_gis_black", title: "Тейбл-тент «Отзывы на картах» 2ГИС (чёрный)", price: 4790, family: "rev" },
  rev_gis_white: { sku: "rev_gis_white", title: "Тейбл-тент «Отзывы на картах» 2ГИС (белый)", price: 4790, family: "rev" },
  rev_duo_black: { sku: "rev_duo_black", title: "Тейбл-тент «Отзывы на картах» Яндекс+2ГИС (чёрный)", price: 4790, family: "rev" },
  rev_duo_white: { sku: "rev_duo_white", title: "Тейбл-тент «Отзывы на картах» Яндекс+2ГИС (белый)", price: 4790, family: "rev" },
};

export interface CartLine {
  product: Product;
  qty: number;
}

/** Цена за штуку с учётом оптовой скидки по количеству в линейке. */
export function tierPrice(product: Product, familyQty: number): number {
  if (!product.family) return product.price;
  let unit = product.price;
  for (const [from, price] of TIERS[product.family]) if (familyQty >= from) unit = price;
  return unit;
}

/**
 * Разбирает корзину из запроса в проверенные позиции с ценами с сервера.
 * Бросает ошибку, если sku неизвестен или количество некорректно.
 * В строках product.price — уже итоговая цена за штуку с оптовой скидкой.
 */
export function parseCart(items: any): { lines: CartLine[]; total: number } {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Корзина пуста");
  }
  const raw: CartLine[] = [];
  for (const it of items) {
    const sku = String(it?.sku || "");
    const product = PRODUCTS[sku];
    if (!product) throw new Error(`Неизвестный товар: ${sku}`);
    let qty = Number(it?.qty || 0);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    qty = Math.min(Math.floor(qty), 999);
    raw.push({ product, qty });
  }
  const famQty: Record<string, number> = {};
  for (const l of raw) if (l.product.family) famQty[l.product.family] = (famQty[l.product.family] || 0) + l.qty;
  let total = 0;
  const lines = raw.map((l) => {
    const price = tierPrice(l.product, l.product.family ? famQty[l.product.family] : 0);
    total += price * l.qty;
    return { product: { ...l.product, price }, qty: l.qty };
  });
  if (total <= 0) throw new Error("Сумма заказа равна нулю");
  return { lines, total };
}
