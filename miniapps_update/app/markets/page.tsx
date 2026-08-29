"use client";

import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronDown, Clock, SlidersHorizontal, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTelegram } from "../../hooks/useTelegram";
import { apiClient, canReserveProduct, isProductDisplayableInMiniApp, NotificationGroup, Product, Store } from "../../lib/api";
import ProductAvailabilityBadge from "../../components/ProductAvailabilityBadge";
import { formatPrice, normalizePrice } from "../../lib/pricing";
import BackButton from "../../components/BackButton";
import ClosingSoonBadge from "../../components/ClosingSoonBadge";
import FavoriteToast from "../../components/FavoriteToast";
import BottomNav from "../../components/BottomNav";
import { useTranslation } from "../../hooks/useTranslation";

type CatalogSortMode = "recommended" | "price_asc" | "discount_desc" | "name_asc";

const getProductPrice = (product: Product) =>
  normalizePrice(product.price || product.discountedPrice || product.originalPrice || 0);

const getProductDiscount = (product: Product) => {
  const price = getProductPrice(product);
  const originalPrice = normalizePrice(product.originalPrice || price);
  return originalPrice > price
    ? Math.round((1 - price / originalPrice) * 100)
    : product.discountPercentage || 0;
};

const sortProducts = (items: Product[], sortMode: CatalogSortMode = "recommended") =>
  [...items].sort((a, b) => {
    const availabilityDiff = Number(canReserveProduct(b)) - Number(canReserveProduct(a));
    if (availabilityDiff !== 0) return availabilityDiff;
    const favoriteDiff = Number(!!b.isFavorite) - Number(!!a.isFavorite);
    if (favoriteDiff !== 0) return favoriteDiff;

    if (sortMode === "discount_desc") {
      return getProductDiscount(b) - getProductDiscount(a);
    }
    if (sortMode === "price_asc") {
      return getProductPrice(a) - getProductPrice(b);
    }

    const closingSoonDiff = Number(!!b.closingSoon) - Number(!!a.closingSoon);
    if (closingSoonDiff !== 0) return closingSoonDiff;
    return getProductDiscount(b) - getProductDiscount(a);
  });

const sortStores = (items: Store[], sortMode: CatalogSortMode = "recommended") =>
  [...items].sort((a, b) => {
    const favoriteDiff = Number(!!b.isFavorite) - Number(!!a.isFavorite);
    if (favoriteDiff !== 0) return favoriteDiff;

    if (sortMode === "name_asc") {
      return a.name.localeCompare(b.name, "ru");
    }
    return 0;
  });

function MarketsContent() {
  const { } = useTelegram(); // Initialize Telegram singleton
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim() || "";
  const categoryId = searchParams.get("categoryId")?.trim() || "";
  const notificationGroupId = searchParams.get("notificationGroupId")?.trim() || "";
  const view = searchParams.get("view")?.trim() || "";
  const showAllProducts = view === "products" || categoryId !== "";
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
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [selectedProductStoreId, setSelectedProductStoreId] = useState("");
  const [selectedProductCategoryId, setSelectedProductCategoryId] = useState(categoryId);
  const [sortMode, setSortMode] = useState<CatalogSortMode>("recommended");

  useEffect(() => {
    setSelectedProductCategoryId(categoryId);
  }, [categoryId]);

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
  const showProductFilters = showAllProducts || products.length > 0;
  const showStoreFilters = stores.length > 0 && !showAllProducts;
  const isPriceFilterActive = minFilterValue !== undefined || maxFilterValue !== undefined;
  const activeFilterCount = [
    showProductFilters && isPriceFilterActive,
    showProductFilters && selectedProductStoreId !== "",
    showProductFilters && selectedProductCategoryId !== "",
    favoritesOnly,
    showProductFilters && discountOnly,
    sortMode !== "recommended",
  ].filter(Boolean).length;
  const priceFilterLabel = minFilterValue !== undefined && maxFilterValue !== undefined
    ? `${formatPrice(minFilterValue)} - ${formatPrice(maxFilterValue)}`
    : minFilterValue !== undefined
      ? `${t("filterFrom")} ${formatPrice(minFilterValue)}`
      : maxFilterValue !== undefined
        ? `${t("filterTo")} ${formatPrice(maxFilterValue)}`
        : t("filterAnyPrice");
  const filterSummary = activeFilterCount > 0
    ? `${activeFilterCount} ${t("filtersApplied")}`
    : t("filtersNone");

  const applyPriceFilter = () => {
    setAppliedMinPrice(minPrice.trim());
    setAppliedMaxPrice(maxPrice.trim());
    setIsPriceFilterOpen(false);
  };

  const resetPriceFilter = () => {
    setMinPrice("");
    setMaxPrice("");
    setAppliedMinPrice("");
    setAppliedMaxPrice("");
    setFavoritesOnly(false);
    setDiscountOnly(false);
    setSelectedProductStoreId("");
    setSelectedProductCategoryId("");
    setSortMode("recommended");
    setIsPriceFilterOpen(false);
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
          })).filter(isProductDisplayableInMiniApp));
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
          setProducts(sortProducts(productsResult.content.filter(isProductDisplayableInMiniApp)));
          return;
        }

        if (showAllProducts) {
          const [storesData, productsResult] = await Promise.all([
            apiClient.getActiveStores(),
            apiClient.getFeaturedProducts(
              0,
              200,
              minFilterValue,
              maxFilterValue,
            ),
          ]);
          setStores(storesData);
          setProducts(sortProducts(productsResult.content.filter(isProductDisplayableInMiniApp)));
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

  const filteredStores = sortStores(stores.filter((store) => {
    if (favoritesOnly && !store.isFavorite) return false;
    return true;
  }), sortMode);
  const favoriteStores = filteredStores.filter((store) => store.isFavorite);
  const regularStores = filteredStores.filter((store) => !store.isFavorite);
  const productStoreOptions = Array.from(
    stores.reduce((map, store) => {
      map.set(String(store.id), store.name);
      return map;
    }, products.reduce((map, product) => {
      if (product.storeId) {
        map.set(String(product.storeId), product.storeName || `Заведение #${product.storeId}`);
      }
      return map;
    }, new Map<string, string>()))
  ).sort(([, aName], [, bName]) => aName.localeCompare(bName, "ru"));
  const productCategoryOptions = Array.from(
    products.reduce((map, product) => {
      if (product.categoryId && product.categoryName) {
        map.set(String(product.categoryId), product.categoryName);
      }
      return map;
    }, new Map<string, string>())
  ).sort(([, aName], [, bName]) => aName.localeCompare(bName, "ru"));
  const filteredProducts = sortProducts(products.filter((product) => {
    const price = getProductPrice(product);
    if (minFilterValue !== undefined && price < minFilterValue) return false;
    if (maxFilterValue !== undefined && price > maxFilterValue) return false;
    if (selectedProductStoreId && String(product.storeId) !== selectedProductStoreId) return false;
    if (selectedProductCategoryId && String(product.categoryId) !== selectedProductCategoryId) return false;
    if (favoritesOnly && !product.isFavorite) return false;
    if (discountOnly && getProductDiscount(product) <= 0) return false;
    return true;
  }), sortMode);
  const selectedProductStoreName = productStoreOptions.find(([id]) => id === selectedProductStoreId)?.[1];
  const selectedProductCategoryName = productCategoryOptions.find(([id]) => id === selectedProductCategoryId)?.[1];
  const sortOptions = (showProductFilters
    ? [
      ["recommended", t("filterRecommended")],
      ["price_asc", t("filterCheapest")],
      ["discount_desc", t("filterBiggestDiscount")],
    ]
    : [
      ["recommended", t("filterRecommended")],
      ["name_asc", t("filterByName")],
    ]) as [CatalogSortMode, string][];
  const sortLabel = sortOptions.find(([value]) => value === sortMode)?.[1];
  const activeFilterChips = [
    isPriceFilterActive ? priceFilterLabel : null,
    selectedProductStoreName ? selectedProductStoreName : null,
    selectedProductCategoryName ? selectedProductCategoryName : null,
    favoritesOnly ? t("filterFavorites") : null,
    discountOnly && showProductFilters ? t("filterDiscounted") : null,
    sortMode !== "recommended" && sortLabel ? `${t("filterSortPrefix")}: ${sortLabel}` : null,
  ].filter(Boolean) as string[];
  const hasDiscountedProducts = products.some((product) => getProductDiscount(product) > 0);
  const canChooseProductStore = productStoreOptions.length > 1;
  const visibleResultCount = showProductFilters && showStoreFilters
    ? filteredProducts.length + filteredStores.length
    : showProductFilters
      ? filteredProducts.length
      : filteredStores.length;

  const FilterToggle = ({
    active,
    children,
    onClick,
  }: {
    active: boolean;
    children: ReactNode;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2.5 text-sm font-bold transition-colors font-inter ${
        active
          ? "bg-[#4CAD73] text-white shadow-[0_7px_18px_rgba(76,173,115,0.20)]"
          : "border border-[#4CAD73]/20 bg-white text-[#4CAD73] shadow-[0_4px_14px_rgba(17,37,44,0.05)]"
      }`}
    >
      {children}
    </button>
  );

  const SortButton = ({ value, label }: { value: CatalogSortMode; label: string }) => (
    <button
      type="button"
      onClick={() => setSortMode(value)}
      className={`min-h-11 rounded-2xl px-3 py-2 text-sm font-bold leading-tight transition-colors font-inter ${
        sortMode === value
          ? "bg-[#4CAD73] text-white shadow-[0_7px_18px_rgba(76,173,115,0.20)]"
          : "border border-[#4CAD73]/20 bg-white text-[#4CAD73] shadow-[0_4px_14px_rgba(17,37,44,0.05)]"
      }`}
    >
      {label}
    </button>
  );

  const StoreCard = ({ store }: { store: Store }) => {
    const isFavorite = !!store.isFavorite;
    const isTogglingFavorite = togglingStoreId === store.id;

    return (
      <article
        className="fs-surface block cursor-pointer rounded-2xl p-4 transition active:scale-[0.99]"
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
    const discount = getProductDiscount(product);
    const isReservable = canReserveProduct(product);

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
            <ProductAvailabilityBadge product={product} />
          </div>
          <h3 className="mt-2 truncate text-sm font-bold text-black font-inter">{product.name}</h3>
          <p className="mt-1 truncate text-xs text-black/50 font-inter">{product.storeName || "FoodSave"}</p>
          {product.closingSoon && (
            <div className="mt-1">
              <ClosingSoonBadge minutes={product.closingSoonMinutes} />
            </div>
          )}
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-sm font-bold font-inter ${isReservable ? "text-[#4CAD73]" : "text-black/55"}`}>
              {formatPrice(price)}
            </span>
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
            {(showProductFilters || showStoreFilters) && !notificationGroup && (
              <>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsPriceFilterOpen((open) => !open)}
                    className="fs-surface flex h-12 w-full items-center justify-between rounded-2xl px-4 text-left font-inter transition active:scale-[0.99]"
                  >
                    <span className="flex items-center gap-3 text-base font-bold text-black">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white">
                        <SlidersHorizontal className="h-4 w-4 text-[#4CAD73]" />
                      </span>
                      {t("filter")}
                    </span>
                    <span className="flex items-center gap-2 text-sm font-bold text-black/45">
                      {activeFilterCount > 0 ? activeFilterCount : t("filtersNone")}
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                    <FilterToggle active={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}>
                      {t("filterFavorites")}
                    </FilterToggle>
                    {showProductFilters && hasDiscountedProducts && (
                      <FilterToggle active={discountOnly} onClick={() => setDiscountOnly((value) => !value)}>
                        {t("filterDiscounted")}
                      </FilterToggle>
                    )}
                  </div>
                  {activeFilterChips.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {activeFilterChips.slice(0, 4).map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-[#4CAD73]/20 bg-[#EDF7F0] px-3 py-1.5 text-xs font-bold text-[#4CAD73] font-inter"
                        >
                          {chip}
                        </span>
                      ))}
                      {activeFilterChips.length > 4 && (
                        <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-black/45 font-inter">
                          +{activeFilterChips.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {isPriceFilterOpen && (
                  <div
                    className="fixed inset-0 z-50 flex items-end bg-black/35"
                    onClick={() => setIsPriceFilterOpen(false)}
                  >
                    <form
                    className="max-h-[86vh] w-full overflow-y-auto rounded-t-[28px] bg-white px-4 pb-6 pt-3 shadow-2xl"
                      onClick={(event) => event.stopPropagation()}
                      onSubmit={(event) => {
                        event.preventDefault();
                        applyPriceFilter();
                      }}
                    >
                      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/15" />
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-black text-black font-inter">{t("filters")}</h2>
                          <p className="mt-1 text-sm font-medium text-black/45 font-inter">{filterSummary}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPriceFilterOpen(false)}
                          aria-label={t("filterClose")}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-5">
                        {showProductFilters && (
                          <>
                            {canChooseProductStore && (
                            <label className="block">
                              <span className="mb-2 block text-sm font-bold text-[#4CAD73] font-inter">{t("filterWhere")}</span>
                              <div className="relative">
                                <select
                                  value={selectedProductStoreId}
                                  onChange={(event) => setSelectedProductStoreId(event.target.value)}
                                  className="h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-11 text-base font-bold text-black outline-none transition-colors focus:border-[#4CAD73] font-inter"
                                >
                                  <option value="">{t("filterAllStores")}</option>
                                  {productStoreOptions.map(([storeId, storeName]) => (
                                    <option key={storeId} value={storeId}>
                                      {storeName}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/35" />
                              </div>
                            </label>
                            )}
                            {productCategoryOptions.length > 1 && (
                              <label className="block">
                                <span className="mb-2 block text-sm font-bold text-[#4CAD73] font-inter">{t("filterWhat")}</span>
                                <div className="relative">
                                  <select
                                    value={selectedProductCategoryId}
                                    onChange={(event) => setSelectedProductCategoryId(event.target.value)}
                                    className="h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-11 text-base font-bold text-black outline-none transition-colors focus:border-[#4CAD73] font-inter"
                                  >
                                    <option value="">{t("filterAllCategories")}</option>
                                    {productCategoryOptions.map(([categoryIdValue, categoryName]) => (
                                      <option key={categoryIdValue} value={categoryIdValue}>
                                        {categoryName}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/35" />
                                </div>
                              </label>
                            )}
                            <div>
                              <span className="mb-2 block text-sm font-bold text-[#4CAD73] font-inter">{t("filterPrice")}</span>
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  value={minPrice}
                                  onChange={(event) => setMinPrice(event.target.value.replace(/[^\d]/g, ""))}
                                  inputMode="numeric"
                                  placeholder={`${t("filterFrom")} 0 ₸`}
                                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base font-bold text-black outline-none focus:border-[#4CAD73] font-inter"
                                />
                                <input
                                  value={maxPrice}
                                  onChange={(event) => setMaxPrice(event.target.value.replace(/[^\d]/g, ""))}
                                  inputMode="numeric"
                                  placeholder={`${t("filterTo")} 2 000 ₸`}
                                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base font-bold text-black outline-none focus:border-[#4CAD73] font-inter"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        <div>
                          <span className="mb-2 block text-sm font-bold text-[#4CAD73] font-inter">{t("filterQuickChoice")}</span>
                          <div className="flex flex-wrap gap-2">
                            <FilterToggle active={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}>
                              {t("filterFavorites")}
                            </FilterToggle>
                            {showProductFilters && hasDiscountedProducts && (
                              <FilterToggle active={discountOnly} onClick={() => setDiscountOnly((value) => !value)}>
                                {t("filterDiscounted")}
                              </FilterToggle>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="mb-2 block text-sm font-bold text-[#4CAD73] font-inter">{t("filterShowFirst")}</span>
                          <div className="grid grid-cols-2 gap-2">
                            {sortOptions.map(([value, label]) => (
                              <SortButton key={value} value={value} label={label} />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="sticky bottom-0 -mx-4 mt-6 grid grid-cols-[1fr_1.5fr] gap-3 border-t border-black/[0.06] bg-white/95 px-4 pb-2 pt-3 backdrop-blur-xl">
                        <button
                          type="button"
                          onClick={resetPriceFilter}
                          className="h-12 rounded-2xl bg-white text-base font-bold text-black/55 font-inter"
                        >
                          {t("filterReset")}
                        </button>
                        <button
                          type="submit"
                          className="h-12 rounded-2xl bg-[#4CAD73] text-base font-bold text-white shadow-[0_7px_18px_rgba(76,173,115,0.20)] font-inter"
                        >
                          {t("filterShow")} {visibleResultCount}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}

            {stores.length > 0 && query && (
              <div className="flex items-baseline justify-between gap-3 pt-1">
                <h2 className="text-lg font-bold text-black font-inter">Заведения</h2>
                <span className="text-xs font-medium text-black/45 font-inter">
                  {filteredStores.length} из {stores.length}
                </span>
              </div>
            )}
            {notificationGroup && (
              <div className="rounded-2xl bg-[#FFF1F1] p-4">
                <p className="text-sm font-semibold text-[#E5484D] font-inter">Доступно сейчас</p>
                <h2 className="mt-1 text-xl font-bold text-black font-inter">
                  {notificationGroup.totalBoxes} боксов со скидкой до {notificationGroup.maximumDiscount || 0}%
                </h2>
              </div>
            )}
            {!showAllProducts && favoriteStores.length > 0 && (
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
            {!showAllProducts && regularStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
            {!showAllProducts && stores.length > 0 && filteredStores.length === 0 && (
              <div className="border-y border-black/[0.06] py-5 text-center">
                <p className="text-sm font-medium text-black/50 font-inter">По этим фильтрам заведений не найдено</p>
              </div>
            )}

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
                  <div className="border-y border-black/[0.06] py-5 text-center">
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

      <BottomNav active="markets" />

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
