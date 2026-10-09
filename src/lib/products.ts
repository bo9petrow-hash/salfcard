/**
 * Каталог товаров и цены — ИСТОЧНИК ПРАВДЫ на сервере.
 *
 * Сумму заказа всегда считает сервер по этому списку, а НЕ по сумме из браузера —
 * иначе покупатель мог бы подменить цену в запросе и оплатить, например, 1 ₽.
 * Если меняешь цены на сайте — поменяй и здесь.
 */
export interface Product {
  sku: string;
  title: string;
  price: number; // ₽ за штуку
}

export const PRODUCTS: Record<string, Product> = {
  card_black_basic: { sku: "card_black_basic", title: "Визитка «Базовый» (чёрная)", price: 1590 },
  card_white_basic: { sku: "card_white_basic", title: "Визитка «Базовый» (белая)", price: 1590 },
  card_black_business: { sku: "card_black_business", title: "Визитка «Бизнес» (чёрная)", price: 1890 },
  card_white_business: { sku: "card_white_business", title: "Визитка «Бизнес» (белая)", price: 1890 },
  tent_black: { sku: "tent_black", title: "Тейбл-тент (чёрный)", price: 4790 },
  tent_white: { sku: "tent_white", title: "Тейбл-тент (белый)", price: 4790 },
};

export interface CartLine {
  product: Product;
  qty: number;
}

/**
 * Разбирает корзину из запроса в проверенные позиции с ценами с сервера.
 * Бросает ошибку, если sku неизвестен или количество некорректно.
 */
export function parseCart(items: any): { lines: CartLine[]; total: number } {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Корзина пуста");
  }
  const lines: CartLine[] = [];
  let total = 0;
  for (const it of items) {
    const sku = String(it?.sku || "");
    const product = PRODUCTS[sku];
    if (!product) throw new Error(`Неизвестный товар: ${sku}`);
    let qty = Number(it?.qty || 0);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    qty = Math.min(Math.floor(qty), 999);
    lines.push({ product, qty });
    total += product.price * qty;
  }
  if (total <= 0) throw new Error("Сумма заказа равна нулю");
  return { lines, total };
}
