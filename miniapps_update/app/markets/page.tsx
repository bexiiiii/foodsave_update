"use client";

import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Clock, SlidersHorizontal, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTelegram } from "../../hooks/useTelegram";
import { apiClient, isProductVisibleInMiniApp, NotificationGroup, Product, Store } from "../../lib/api";
import { formatPrice, normalizePrice } from "../../lib/pricing";
import BackButton from "../../components/BackButton";
import ClosingSoonBadge from "../../components/ClosingSoonBadge";
import FavoriteToast from "../../components/FavoriteToast";

const getProductPrice = (product: Product) =>
  normalizePrice(product.price || product.discountedPrice || product.originalPrice || 0);

const sortProducts = (items: Product[]) =>
  [...items].sort((a, b) => {
    const favoriteDiff = Number(!!b.isFavorite) - Number(!!a.isFavorite);
    if (favoriteDiff !== 0) return favoriteDiff;
    return getProductPrice(a) - getProductPrice(b);
  });

function MarketsContent() {
  const { } = useTelegram(); // Initialize Telegram singleton
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim() || "";
  const categoryId = searchParams.get("categoryId")?.trim() || "";
  const notificationGroupId = searchParams.get("notificationGroupId")?.trim() || "";
  const view = searchParams.get("view")?.trim() || "";
  const showAllProducts = view === "products";
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notificationGroup, setNotificationGroup] = useState<NotificationGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ title: string; itemName: string } | null>(null);
  const [togglingStoreId, setTogglingStoreId] = useState<number | null>(null);
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = useState("");

  const appliedMinPriceValue = Number(appliedMinPrice);
  const appliedMaxPriceValue = Number(appliedMaxPrice);
  const hasAppliedMinPrice = appliedMinPrice.trim() !== "" && Number.isFinite(appliedMinPriceValue);
  const hasAppliedMaxPrice = appliedMaxPrice.trim() !== "" && Number.isFinite(appliedMaxPriceValue);
  const minFilterValue = hasAppliedMinPrice && hasAppliedMaxPrice
    ? Math.min(appliedMinPriceValue, appliedMaxPriceValue)
    : hasAppliedMinPrice
      ? appliedMinPriceValue
      : undefined;
  const maxFilterValue = hasAppliedMinPrice && hasAppliedMaxPrice
    ? Math.max(appliedMinPriceValue, appliedMaxPriceValue)
    : hasAppliedMaxPrice
      ? appliedMaxPriceValue
      : undefined;
  const isPriceFilterActive = minFilterValue !== undefined || maxFilterValue !== undefined;
  const hasPendingPriceChanges = minPrice !== appliedMinPrice || maxPrice !== appliedMaxPrice;

  const applyPriceFilter = () => {
    setAppliedMinPrice(minPrice.trim());
    setAppliedMaxPrice(maxPrice.trim());
  };

  const resetPriceFilter = () => {
    setMinPrice("");
    setMaxPrice("");
    setAppliedMinPrice("");
    setAppliedMaxPrice("");
  };

  const toggleStoreFavorite = async (store: Store) => {
    if (togglingStoreId === store.id) return;

    const previousValue = !!store.isFavorite;
    setTogglingStoreId(store.id);
    setStores((prev) =>
      prev.map((s) => (s.id === store.id ? { ...s, isFavorite: !previousValue } : s))
    );
    setToast({
      title: previousValue ? "Убрано из избранного" : "Добавлено в избранное",
      itemName: store.name,
    });
    try {
      await apiClient.toggleFavoriteStore(store.id, previousValue);
    } catch (error) {
      console.error("Failed to toggle favorite store:", error);
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, isFavorite: previousValue } : s))
      );
    } finally {
      setTogglingStoreId(null);
    }
  };

  const toggleProductFavorite = async (product: Product) => {
    if (togglingProductId === product.id) return;

    const previousValue = !!product.isFavorite;
    setTogglingProductId(product.id);
    setProducts((prev) =>
      sortProducts(prev.map((item) => (item.id === product.id ? { ...item, isFavorite: !previousValue } : item)))
    );
    setToast({
      title: previousValue ? "Убрано из избранного" : "Добавлено в избранное",
      itemName: product.name,
    });
    try {
      await apiClient.toggleFavoriteProduct(product.id, previousValue);
    } catch (error) {
      console.error("Failed to toggle favorite product:", error);
      setProducts((prev) =>
        sortProducts(prev.map((item) => (item.id === product.id ? { ...item, isFavorite: previousValue } : item)))
      );
    } finally {
      setTogglingProductId(null);
    }
  };

  useEffect(() => {
    const loadStores = async () => {
      try {
        setIsLoading(true);
        if (notificationGroupId) {
          const group = await apiClient.getNotificationGroup(Number(notificationGroupId));
          setNotificationGroup(group);
          await apiClient.markNotificationGroupOpened(Number(notificationGroupId));
          const groupedStores = new Map<number, Store>();
          group.items.forEach((item) => {
            if (!groupedStores.has(item.partnerId)) {
              groupedStores.set(item.partnerId, {
                id: item.partnerId,
                name: item.partnerName,
                address: "",
                phone: "",
                status: "ACTIVE",
                ownerId: 0,
                active: true,
                createdAt: "",
                updatedAt: "",
              });
            }
          });
          setStores(Array.from(groupedStores.values()));
          setProducts(group.items.filter((item) => item.boxId).map((item) => ({
            id: item.boxId!,
            name: item.boxName || "FoodSave box",
            imageUrl: item.boxImageUrl,
            originalPrice: item.originalPrice || item.price || 0,
            price: item.price,
            discountPercentage: item.discountPercent,
            stockQuantity: item.availableQuantity,
            storeId: item.partnerId,
            storeName: item.partnerName,
            status: "AVAILABLE",
            featured: true,
            createdAt: "",
            updatedAt: "",
          })).filter(isProductVisibleInMiniApp));
          apiClient.trackEvent({
            eventType: "NOTIFICATION_DEEPLINK_OPENED",
            sessionId: sessionStorage.getItem("foodsaveSessionId") || undefined,
            source: "telegram_notification",
            notificationGroupId: Number(notificationGroupId),
            startParam: `notification_${notificationGroupId}`,
            idempotencyKey: `notification-deeplink-${notificationGroupId}-${sessionStorage.getItem("foodsaveSessionId") || ""}`,
          });
          return;
        }

        if (query) {
          const [storesResult, productsResult] = await Promise.all([
            apiClient.searchStores(query, 0, 50),
            apiClient.searchProducts(
              query,
              0,
              50,
              minFilterValue,
              maxFilterValue,
            ),
          ]);
          setStores(storesResult.content);
          setProducts(sortProducts(productsResult.content.filter(isProductVisibleInMiniApp)));
          return;
        }

        if (showAllProducts) {
          const productsResult = await apiClient.getFeaturedProducts(
            0,
            200,
            minFilterValue,
            maxFilterValue,
          );
          setStores([]);
          setProducts(sortProducts(productsResult.content.filter(isProductVisibleInMiniApp)));
          return;
        }

        const storesData = await apiClient.getActiveStores();
        setProducts([]);
        setStores(
          categoryId
            ? storesData.filter((store) => String(store.category || "") === categoryId)
            : storesData
        );
      } catch (error) {
        console.error('Failed to load stores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStores();
  }, [query, categoryId, notificationGroupId, showAllProducts, minFilterValue, maxFilterValue]);

  const formatOpeningHours = (store: Store) => {
    if (store.openingHours && store.closingHours) {
      return `${store.openingHours} - ${store.closingHours}`;
    }
    if (store.openingHours) {
      return `${store.openingHours} - 22:00`;
    }
    return "9:00 - 22:00";
  };

  const favoriteStores = stores.filter((store) => store.isFavorite);
  const regularStores = stores.filter((store) => !store.isFavorite);
  const filteredProducts = products.filter((product) => {
    const price = getProductPrice(product);
    if (minFilterValue !== undefined && price < minFilterValue) return false;
    if (maxFilterValue !== undefined && price > maxFilterValue) return false;
    return true;
  });

  const StoreCard = ({ store }: { store: Store }) => {
    const isFavorite = !!store.isFavorite;
    const isTogglingFavorite = togglingStoreId === store.id;

    return (
      <article
        className="block cursor-pointer rounded-2xl bg-gray-100 p-4 transition-colors hover:bg-gray-200"
        onClick={() => router.push(`/boxes?storeId=${store.id}`)}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#4CAD73] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
            {store.logo ? (
              <img
                src={store.logo}
                alt={store.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-lg font-inter">
                {store.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-black font-inter mb-1 truncate">
              {store.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-black/60 font-inter">
              <Clock className="w-4 h-4" />
              <span>{formatOpeningHours(store)}</span>
            </div>
            {store.address && (
              <p className="text-xs text-black/50 font-inter mt-1 truncate">
                {store.address}
              </p>
            )}
            {store.closingSoon && (
              <ClosingSoonBadge
                minutes={store.closingSoonMinutes}
                className="inline-flex items-center gap-1 mt-2 text-[12px] font-medium text-[#FF9500] bg-[#FF9500]/10 rounded-full px-2.5 py-1 font-inter"
              />
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
              disabled={isTogglingFavorite}
              className={`flex h-9 w-9 items-center justify-center transition-colors active:scale-90 ${
                isFavorite ? "text-amber-500" : "text-black/40"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                toggleStoreFavorite(store);
              }}
              type="button"
            >
              <Star className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
            </button>
            {store.rating && (
              <div className="flex items-center gap-1 bg-[#4CAD73] rounded-lg px-2 py-1">
                <span className="text-white text-sm font-medium font-inter">
                  {store.rating.toFixed(1)}
                </span>
                <span className="text-white text-xs">★</span>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  };

  const ProductCard = ({ product }: { product: Product }) => {
    const isFavorite = !!product.isFavorite;
    const isTogglingFavorite = togglingProductId === product.id;
    const price = getProductPrice(product);
    const originalPrice = normalizePrice(product.originalPrice || price);
    const discount = originalPrice > price
      ? Math.round((1 - price / originalPrice) * 100)
      : product.discountPercentage || 0;

    return (
      <Link key={product.id} href={`/details/${product.id}`} className="min-w-0">
        <article>
          <div className="relative h-36 overflow-hidden rounded-2xl bg-gray-100">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#4CAD73] text-xl font-bold text-white">FS</div>
            )}
            {discount > 0 && (
              <div className="absolute left-2 top-2 rounded-full bg-[#E5484D] px-3 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-red-500/25 font-inter">
                -{discount}%
              </div>
            )}
            <button
              aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
              disabled={isTogglingFavorite}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleProductFavorite(product);
              }}
              type="button"
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center transition-transform active:scale-90"
            >
              <Star
                className={`h-5 w-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] ${isFavorite ? "text-amber-400" : "text-white"}`}
                fill={isFavorite ? "currentColor" : "none"}
              />
            </button>
          </div>
          <h3 className="mt-2 truncate text-sm font-bold text-black font-inter">{product.name}</h3>
          <p className="mt-1 truncate text-xs text-black/50 font-inter">{product.storeName || "FoodSave"}</p>
          {product.closingSoon && (
            <div className="mt-1">
              <ClosingSoonBadge minutes={product.closingSoonMinutes} />
            </div>
          )}
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-bold text-[#15551F] font-inter">{formatPrice(price)}</span>
            {originalPrice > price && (
              <span className="text-xs text-black/35 line-through font-inter">{formatPrice(originalPrice)}</span>
            )}
          </div>
        </article>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <BackButton fallback="/" />
          <h1 className="text-xl font-bold text-black font-inter">
            {notificationGroup ? "Подборка FoodSave" : query ? `Поиск: ${query}` : showAllProducts ? "Боксы" : "Заведения"}
          </h1>
        </div>
      </div>

      {/* Markets List */}
      <div className="px-4 mt-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-gray-100 rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {(showAllProducts || products.length > 0) && !notificationGroup && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-black font-inter">
                    <SlidersHorizontal className="h-4 w-4 text-[#15551F]" />
                    Фильтр по цене
                  </div>
                  {isPriceFilterActive && (
                    <button
                      type="button"
                      onClick={resetPriceFilter}
                      className="flex items-center gap-1 text-xs font-semibold text-black/50 font-inter"
                    >
                      <X className="h-3.5 w-3.5" />
                      Сбросить
                    </button>
                  )}
                </div>
                <form
                  className="grid grid-cols-2 gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyPriceFilter();
                  }}
                >
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-black/45 font-inter">От</span>
                    <input
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value.replace(/[^\d]/g, ""))}
                      inputMode="numeric"
                      placeholder="0 ₸"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-black outline-none focus:border-[#4CAD73] font-inter"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-black/45 font-inter">До</span>
                    <input
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value.replace(/[^\d]/g, ""))}
                      inputMode="numeric"
                      placeholder="2 000 ₸"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-black outline-none focus:border-[#4CAD73] font-inter"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={!hasPendingPriceChanges}
                    className="col-span-2 h-11 rounded-xl bg-[#15551F] text-sm font-bold text-white transition-opacity disabled:opacity-45 font-inter"
                  >
                    Применить
                  </button>
                </form>
              </div>
            )}

            {stores.length > 0 && query && (
              <h2 className="pt-1 text-lg font-bold text-black font-inter">Заведения</h2>
            )}
            {notificationGroup && (
              <div className="rounded-2xl bg-[#FFF1F1] p-4">
                <p className="text-sm font-semibold text-[#E5484D] font-inter">Доступно сейчас</p>
                <h2 className="mt-1 text-xl font-bold text-black font-inter">
                  {notificationGroup.totalBoxes} боксов со скидкой до {notificationGroup.maximumDiscount || 0}%
                </h2>
              </div>
            )}
            {favoriteStores.length > 0 && (
              <>
                <h2 className="pt-1 text-lg font-bold text-black font-inter">Избранное</h2>
                {favoriteStores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
                {regularStores.length > 0 && (
                  <h2 className="pt-3 text-lg font-bold text-black font-inter">Все заведения</h2>
                )}
              </>
            )}
            {regularStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}

            {products.length > 0 && (
              <>
                <div className="flex items-baseline justify-between gap-3 pt-3">
                  <h2 className="text-lg font-bold text-black font-inter">Боксы</h2>
                  <span className="text-xs font-medium text-black/45 font-inter">
                    {filteredProducts.length} из {products.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {filteredProducts.length === 0 && (
                  <div className="rounded-2xl bg-gray-100 p-5 text-center">
                    <p className="text-sm font-medium text-black/50 font-inter">В этом диапазоне цены боксов не найдены</p>
                  </div>
                )}
              </>
            )}
            
            {stores.length === 0 && products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-black/50 font-inter">
                  {query ? "По вашему запросу ничего не найдено" : showAllProducts ? "Боксы не найдены" : "Заведения не найдены"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-100 rounded-t-3xl px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <Link href="/" className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </Link>
          
          <Link href="/markets" className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-[#4CAD73] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </Link>
          
          <Link href="/orders" className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </Link>
          
          <Link href="/profile" className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </Link>
        </div>
      </nav>

      <FavoriteToast title={toast?.title ?? null} itemName={toast?.itemName} onClose={() => setToast(null)} />
    </div>
  );
}

function MarketsLoading() {
  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <div className="h-7 w-32 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div className="px-4 mt-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-gray-100 rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded mb-2" />
                <div className="h-3 bg-gray-300 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <Suspense fallback={<MarketsLoading />}>
      <MarketsContent />
    </Suspense>
  );
}
