import { canReserveProduct, type FavoritesResponse, type Order, type Product } from "./api";


type ViewedBox = Pick<Product, "id" | "name" | "description" | "storeId" | "categoryName"> & {
  views: number;
  lastViewedAt: number;
};

const INTERACTIONS_KEY = "foodsave_box_views_v2";
const RECENT_VIEWS_KEY = "foodsave_recent_product_views_v1";
const HELP_DISMISSED_KEY = "foodsave_decision_help_dismissed_at_v1";
const HELP_SHOWN_SESSION_KEY = "foodsave_decision_help_shown_v2";
const HELP_SERVER_CHECKED_AT_KEY = "foodsave_decision_help_checked_at_v1";
const MAX_INTERACTIONS = 60;
const RECENT_VIEW_WINDOW_MS = 20 * 60 * 1000;
const HELP_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SAME_PRODUCT_VIEW_COOLDOWN_MS = 45 * 1000;
const HELP_SERVER_CHECK_COOLDOWN_MS = 60 * 1000;
const NON_POSITIVE_ORDER_STATUSES = new Set([
  "CANCELLED",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_PARTNER",
  "EXPIRED",
  "NO_SHOW",
  "REJECTED",
  "REFUNDED",
]);

const isBrowser = () => typeof window !== "undefined";

const readJson = <T,>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota/private mode failures; personalization is optional.
  }
};

// Telegram's ID only namespaces local browsing history. Orders and favorites
// come from the authenticated API. Never attribute the old shared key to a user.
const telegramUserId = () => isBrowser() ? window.Telegram?.WebApp?.initDataUnsafe?.user?.id : undefined;
const readViews = (id?: string | number) =>
  id ? readJson<ViewedBox[]>(`${INTERACTIONS_KEY}:${id}`, []) : [];
const recentViewsKey = () => `${RECENT_VIEWS_KEY}:${telegramUserId() ?? "guest"}`;

export const recordProductView = (product: Product) => {
  if (!product?.id) return false;
  const now = Date.now();
  const recentViews = readJson<Array<{ productId: number; viewedAt: number }>>(recentViewsKey(), [])
    .filter((item) => now - item.viewedAt <= RECENT_VIEW_WINDOW_MS);
  if (recentViews.some(item => item.productId === product.id && now - item.viewedAt < SAME_PRODUCT_VIEW_COOLDOWN_MS)) return false;

  const id = telegramUserId();
  if (id) {
    const views = readViews(id);
    const previous = views.find(item => item.id === product.id);
    const item: ViewedBox = {
      id: product.id, name: product.name, description: product.description, storeId: product.storeId, categoryName: product.categoryName,
      views: (previous?.views ?? 0) + 1, lastViewedAt: now,
    };
    writeJson(`${INTERACTIONS_KEY}:${id}`, [item, ...views.filter(view => view.id !== product.id)].slice(0, MAX_INTERACTIONS));
  }

  const nextRecentViews = recentViews
    .concat({ productId: product.id, viewedAt: now })
    .slice(-20);
  writeJson(recentViewsKey(), nextRecentViews);
  return true;
};

const genericWords = new Set(["бокс", "набор", "порция", "штуки", "вместо", "состав", "комплект", "входит", "бокса", "подарок", "штук", "доставка", "порции", "box", "foodsave"]);
const dishWords = (name: string, description?: string) => new Set(
  ([name, description].join(" ").toLowerCase().replace(/ё/g, "е").match(/[a-zа-яәғқңөұүһі]+/gu) ?? [])
    .filter(word => word.length >= 3 && !genericWords.has(word))
);

export interface RecommendationHistory {
  orders?: Order[];
  favorites?: FavoritesResponse;
  telegramId?: string | number;
  favoriteOverrides?: Record<number, boolean>;
}

export const rankProductsForRecommendations = (
  products: Product[],
  additionalScore: (product: Product) => number = () => 0,
  history: RecommendationHistory = {},
) => {
  const dishes = new Map<string, number>();
  const stores = new Map<number, number>();
  const categories = new Map<string, number>();
  const exact = new Map<number, number>();
  function addInterest(id: number, name: string, storeId: number, category: string | undefined, weight: number, description?: string) {
    exact.set(id, (exact.get(id) ?? 0) + weight);
    stores.set(storeId, (stores.get(storeId) ?? 0) + weight);
    if (category) categories.set(category, (categories.get(category) ?? 0) + weight);
    for (const word of dishWords(name, description)) dishes.set(word, (dishes.get(word) ?? 0) + weight);
  }
  const now = Date.now();
  for (const view of readViews(history.telegramId ?? telegramUserId())) {
    const days = Math.max(0, (now - view.lastViewedAt) / 86400000);
    if (days <= 90) addInterest(view.id, view.name, view.storeId, view.categoryName, Math.min(view.views, 4) * 10 / (1 + days / 30), view.description);
  }
  for (const order of history.orders ?? []) {
    if (NON_POSITIVE_ORDER_STATUSES.has(order.status)) continue;
    const days = Math.max(0, (now - Date.parse(order.createdAt)) / 86400000);
    if (!Number.isFinite(days) || days > 90) continue;
    for (const item of order.orderItems ?? order.items ?? []) {
      addInterest(item.productId, item.productName ?? "", order.storeId, undefined, 44 / (1 + days / 30));
    }
  }
  const favorites = new Map((history.favorites?.products ?? []).map(product => [product.id, product]));
  for (const product of products) {
    if (product.isFavorite) favorites.set(product.id, product);
    else if (history.favoriteOverrides?.[product.id] === false) favorites.delete(product.id);
  }
  for (const product of favorites.values()) addInterest(product.id, product.name, product.storeId, product.categoryName, 50, product.description);
  for (const store of history.favorites?.stores ?? []) stores.set(store.id, (stores.get(store.id) ?? 0) + 50);

  const candidates = products.map((product, index) => {
    const wordScores = Array.from(dishWords(product.name, product.description), word => dishes.get(word) ?? 0);
    const score = Math.min(exact.get(product.id) ?? 0, 120)
      + Math.min(Math.max(0, ...wordScores), 90)
      + Math.min(stores.get(product.storeId) ?? 0, 80) * 0.35
      + Math.min(categories.get(product.categoryName ?? "") ?? 0, 60) * 0.25
      + additionalScore(product);
    // The API order already includes favorites, discounts and server-side signals.
    return { product, baseScore: score + 12 / (1 + index / 5) };
  }).sort((a, b) => b.baseScore - a.baseScore);
  const ranked: Product[] = [];
  const storeCounts = new Map<number, number>();
  const categoryCounts = new Map<string, number>();

  for (const remaining of [candidates.filter(item => canReserveProduct(item.product)), candidates.filter(item => !canReserveProduct(item.product))]) {
    while (remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = Number.NEGATIVE_INFINITY;
      const candidateWindow = Math.min(remaining.length, 12);
      for (let index = 0; index < candidateWindow; index += 1) {
        const { product, baseScore } = remaining[index];
        const storeCount = storeCounts.get(product.storeId) || 0;
        const categoryKey = product.categoryName || String(product.categoryId || "unknown");
        const categoryCount = categoryCounts.get(categoryKey) || 0;
        const diversityPenalty = storeCount * 36 + categoryCount * 10;
        const score = baseScore - diversityPenalty;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }

      const [selected] = remaining.splice(bestIndex, 1);
      ranked.push(selected.product);
      storeCounts.set(selected.product.storeId, (storeCounts.get(selected.product.storeId) || 0) + 1);
      const categoryKey = selected.product.categoryName || String(selected.product.categoryId || "unknown");
      categoryCounts.set(categoryKey, (categoryCounts.get(categoryKey) || 0) + 1);
    }
  }

  return ranked;
};

export const canShowDecisionHelpPrompt = () => {
  if (!isBrowser()) return false;
  try {
    if (sessionStorage.getItem(HELP_SHOWN_SESSION_KEY) === "1") return false;
    const dismissedAt = Number(localStorage.getItem(HELP_DISMISSED_KEY) || 0);
    return !dismissedAt || Date.now() - dismissedAt >= HELP_COOLDOWN_MS;
  } catch {
    return false;
  }
};

export const markDecisionHelpPromptShown = () => {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(HELP_SHOWN_SESSION_KEY, "1");
  } catch {
    // Personalization remains optional in restricted browser storage modes.
  }
};

export const shouldShowDecisionHelpPrompt = () => {
  if (!canShowDecisionHelpPrompt()) return false;
  try {
    const now = Date.now();
    const recentViews = readJson<Array<{ productId: number; viewedAt: number }>>(recentViewsKey(), [])
      .filter((item) => now - item.viewedAt <= RECENT_VIEW_WINDOW_MS);
    const uniqueProductIds = new Set(recentViews.map((item) => item.productId));
    return recentViews.length >= 4 && uniqueProductIds.size >= 3;
  } catch {
    return false;
  }
};

export const shouldCheckDecisionHelpServer = () => {
  if (!canShowDecisionHelpPrompt()) return false;
  try {
    const now = Date.now();
    const lastCheckedAt = Number(sessionStorage.getItem(HELP_SERVER_CHECKED_AT_KEY) || 0);
    if (lastCheckedAt && now - lastCheckedAt < HELP_SERVER_CHECK_COOLDOWN_MS) return false;

    const recentViews = readJson<Array<{ productId: number; viewedAt: number }>>(recentViewsKey(), [])
      .filter((item) => now - item.viewedAt <= RECENT_VIEW_WINDOW_MS);
    const uniqueProductIds = new Set(recentViews.map((item) => item.productId));
    if (recentViews.length < 3 || uniqueProductIds.size < 2) return false;

    sessionStorage.setItem(HELP_SERVER_CHECKED_AT_KEY, String(now));
    return true;
  } catch {
    return false;
  }
};

export const dismissDecisionHelpPrompt = () => {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(HELP_DISMISSED_KEY, String(Date.now()));
  } catch {
    // The support link still works when Telegram storage is unavailable.
  }
};

export const getPersonalizationSessionId = () => {
  if (!isBrowser()) return "anonymous";
  try {
    const existing = sessionStorage.getItem("foodsaveSessionId");
    if (existing) return existing;
    const generated = typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("foodsaveSessionId", generated);
    return generated;
  } catch {
    return "anonymous";
  }
};
