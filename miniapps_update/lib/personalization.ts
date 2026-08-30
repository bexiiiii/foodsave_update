import type { Order, Product } from "./api";
import { normalizePrice } from "./pricing";

type ProductInteraction = {
  id: number;
  name?: string;
  storeId?: number;
  storeName?: string;
  categoryName?: string;
  views: number;
  reservations: number;
  favorites: number;
  lastViewedAt?: number;
  lastReservedAt?: number;
};

const INTERACTIONS_KEY = "foodsave_product_interactions_v1";
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

const getProductPrice = (product: Product) =>
  normalizePrice(product.price || product.discountedPrice || product.originalPrice || 0);

const getProductDiscount = (product: Product) => {
  const price = getProductPrice(product);
  const originalPrice = normalizePrice(product.originalPrice || price);
  return originalPrice > price
    ? Math.round((1 - price / originalPrice) * 100)
    : product.discountPercentage || 0;
};

const readInteractions = () =>
  readJson<Record<string, ProductInteraction>>(INTERACTIONS_KEY, {});

const writeInteractions = (interactions: Record<string, ProductInteraction>) => {
  const trimmed = Object.fromEntries(
    Object.entries(interactions)
      .sort(([, a], [, b]) => (b.lastViewedAt || b.lastReservedAt || 0) - (a.lastViewedAt || a.lastReservedAt || 0))
      .slice(0, MAX_INTERACTIONS)
  );
  writeJson(INTERACTIONS_KEY, trimmed);
};

export const recordProductView = (product: Product) => {
  if (!product?.id) return false;
  const now = Date.now();
  const recentViews = readJson<Array<{ productId: number; viewedAt: number }>>(RECENT_VIEWS_KEY, [])
    .filter((item) => now - item.viewedAt <= RECENT_VIEW_WINDOW_MS);
  const lastSameProductView = [...recentViews].reverse().find((item) => item.productId === product.id);
  if (lastSameProductView && now - lastSameProductView.viewedAt < SAME_PRODUCT_VIEW_COOLDOWN_MS) return false;
  const interactions = readInteractions();
  const current = interactions[String(product.id)] || {
    id: product.id,
    views: 0,
    reservations: 0,
    favorites: 0,
  };

  interactions[String(product.id)] = {
    ...current,
    name: product.name,
    storeId: product.storeId,
    storeName: product.storeName,
    categoryName: product.categoryName,
    views: current.views + 1,
    favorites: product.isFavorite ? Math.max(current.favorites, 1) : current.favorites,
    lastViewedAt: now,
  };
  writeInteractions(interactions);

  const nextRecentViews = recentViews
    .concat({ productId: product.id, viewedAt: now })
    .slice(-20);
  writeJson(RECENT_VIEWS_KEY, nextRecentViews);
  return true;
};

export const recordProductReservation = (product: Product) => {
  if (!product?.id) return;
  const now = Date.now();
  const interactions = readInteractions();
  const current = interactions[String(product.id)] || {
    id: product.id,
    views: 0,
    reservations: 0,
    favorites: 0,
  };

  interactions[String(product.id)] = {
    ...current,
    name: product.name,
    storeId: product.storeId,
    storeName: product.storeName,
    categoryName: product.categoryName,
    reservations: current.reservations + 1,
    favorites: product.isFavorite ? Math.max(current.favorites, 1) : current.favorites,
    lastReservedAt: now,
  };
  writeInteractions(interactions);
};

export const seedRecommendationsFromOrders = (orders: Order[]) => {
  if (!Array.isArray(orders) || orders.length === 0) return false;

  const interactions = readInteractions();
  const totals = new Map<number, {
    quantity: number;
    lastReservedAt: number;
    name?: string;
    storeId?: number;
    storeName?: string;
  }>();
  let changed = false;

  orders.forEach((order) => {
    if (NON_POSITIVE_ORDER_STATUSES.has(order.status)) return;

    const orderItems = Array.isArray(order.orderItems)
      ? order.orderItems
      : Array.isArray(order.items)
        ? order.items
        : [];
    const reservedAt = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();

    orderItems.forEach((item) => {
      if (!item.productId) return;
      const quantity = Math.max(Number(item.quantity || 1), 1);
      const previous = totals.get(item.productId);
      totals.set(item.productId, {
        quantity: (previous?.quantity || 0) + quantity,
        lastReservedAt: Math.max(previous?.lastReservedAt || 0, Number.isFinite(reservedAt) ? reservedAt : Date.now()),
        name: item.productName || previous?.name,
        storeId: order.storeId || previous?.storeId,
        storeName: order.storeName || previous?.storeName,
      });
    });
  });

  totals.forEach((signal, productId) => {
      const key = String(productId);
      const current = interactions[key] || {
        id: productId,
        views: 0,
        reservations: 0,
        favorites: 0,
      };
      const next = {
        ...current,
        name: signal.name || current.name,
        storeId: signal.storeId || current.storeId,
        storeName: signal.storeName || current.storeName,
        reservations: Math.max(current.reservations, signal.quantity),
        lastReservedAt: Math.max(current.lastReservedAt || 0, signal.lastReservedAt),
      };
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        interactions[key] = next;
        changed = true;
      }
  });

  if (changed) writeInteractions(interactions);
  return changed;
};

const calculateProductRecommendationScore = (
  product: Product,
  interactions: Record<string, ProductInteraction>
) => {
  const own = interactions[String(product.id)];
  const storeAffinity = Object.values(interactions)
    .filter((item) => item.storeId && item.storeId === product.storeId)
    .reduce((score, item) => score + item.views * 2 + item.reservations * 18 + item.favorites * 10, 0);
  const categoryAffinity = Object.values(interactions)
    .filter((item) => item.categoryName && item.categoryName === product.categoryName)
    .reduce((score, item) => score + item.views + item.reservations * 8, 0);

  return (
    (product.isFavorite ? 120 : 0) +
    (own?.views || 0) * 8 +
    (own?.reservations || 0) * 60 +
    (own?.favorites || 0) * 40 +
    storeAffinity +
    categoryAffinity +
    (product.closingSoon ? 12 : 0) +
    Math.min(getProductDiscount(product), 60)
  );
};

export const getProductRecommendationScore = (product: Product) =>
  calculateProductRecommendationScore(product, readInteractions());

export const rankProductsForRecommendations = (
  products: Product[],
  additionalScore: (product: Product) => number = () => 0
) => {
  const interactions = readInteractions();
  const remaining = products
    .map((product) => ({
      product,
      baseScore:
        calculateProductRecommendationScore(product, interactions)
        + additionalScore(product)
        + (product.canReserve === false ? -1000 : 0),
    }))
    .sort((a, b) => b.baseScore - a.baseScore);
  const ranked: Product[] = [];
  const storeCounts = new Map<number, number>();
  const categoryCounts = new Map<string, number>();

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
    const recentViews = readJson<Array<{ productId: number; viewedAt: number }>>(RECENT_VIEWS_KEY, [])
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

    const recentViews = readJson<Array<{ productId: number; viewedAt: number }>>(RECENT_VIEWS_KEY, [])
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
