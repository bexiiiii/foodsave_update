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
const MAX_INTERACTIONS = 60;
const RECENT_VIEW_WINDOW_MS = 15 * 60 * 1000;
const HELP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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
    views: current.views + 1,
    favorites: product.isFavorite ? Math.max(current.favorites, 1) : current.favorites,
    lastViewedAt: now,
  };
  writeInteractions(interactions);

  const recentViews = readJson<Array<{ productId: number; viewedAt: number }>>(RECENT_VIEWS_KEY, [])
    .filter((item) => now - item.viewedAt <= RECENT_VIEW_WINDOW_MS)
    .concat({ productId: product.id, viewedAt: now })
    .slice(-20);
  writeJson(RECENT_VIEWS_KEY, recentViews);
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
  let changed = false;

  orders.forEach((order) => {
    const orderItems = Array.isArray(order.orderItems)
      ? order.orderItems
      : Array.isArray(order.items)
        ? order.items
        : [];
    const reservedAt = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();

    orderItems.forEach((item) => {
      if (!item.productId) return;
      const key = String(item.productId);
      const current = interactions[key] || {
        id: item.productId,
        views: 0,
        reservations: 0,
        favorites: 0,
      };
      const quantity = Math.max(Number(item.quantity || 1), 1);
      interactions[key] = {
        ...current,
        name: item.productName || current.name,
        storeId: order.storeId || current.storeId,
        storeName: order.storeName || current.storeName,
        reservations: Math.max(current.reservations, quantity),
        lastReservedAt: Math.max(current.lastReservedAt || 0, Number.isFinite(reservedAt) ? reservedAt : Date.now()),
      };
      changed = true;
    });
  });

  if (changed) writeInteractions(interactions);
  return changed;
};

export const getProductRecommendationScore = (product: Product) => {
  const interactions = readInteractions();
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

export const shouldShowDecisionHelpPrompt = () => {
  if (!isBrowser()) return false;
  const now = Date.now();
  const dismissedAt = Number(localStorage.getItem(HELP_DISMISSED_KEY) || 0);
  if (dismissedAt && now - dismissedAt < HELP_COOLDOWN_MS) return false;

  const recentViews = readJson<Array<{ productId: number; viewedAt: number }>>(RECENT_VIEWS_KEY, [])
    .filter((item) => now - item.viewedAt <= RECENT_VIEW_WINDOW_MS);
  const uniqueProductIds = new Set(recentViews.map((item) => item.productId));
  return recentViews.length >= 5 && uniqueProductIds.size >= 3;
};

export const dismissDecisionHelpPrompt = () => {
  if (!isBrowser()) return;
  localStorage.setItem(HELP_DISMISSED_KEY, String(Date.now()));
};
