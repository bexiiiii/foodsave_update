"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ChevronRight,
  LocateFixed,
  LoaderCircle,
  MapPin,
  PackageOpen,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
import ClosingSoonBadge from "../components/ClosingSoonBadge";
import FavoriteToast from "../components/FavoriteToast";
import { useTranslation } from "../hooks/useTranslation";
import { useAuth } from "../hooks/useAuth";
import { useTelegram } from "../hooks/useTelegram";
import { useCategories, useRecommendedProducts } from "../hooks/useData";
import { safeString } from "../lib/utils";
import { safeArray } from "../lib/api";
import { apiClient, canReserveProduct, Category, Product, isProductDisplayableInMiniApp } from "../lib/api";
import ProductAvailabilityBadge from "../components/ProductAvailabilityBadge";
import { rankProductsForRecommendations, seedRecommendationsFromOrders } from "../lib/personalization";
import { formatPrice, normalizePrice } from "../lib/pricing";
import { isLocationFresh, readSavedLocation, requestCurrentLocation, UserLocation } from "../lib/location";

const getCurrentPrice = (product: Partial<Product>) =>
  normalizePrice(product.price || product.discountedPrice || product.originalPrice || 0);

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const getDistanceKm = (from: UserLocation | null, product: Product) => {
  if (!from || typeof product.storeLatitude !== "number" || typeof product.storeLongitude !== "number") {
    return null;
  }

  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(product.storeLatitude - from.latitude);
  const deltaLongitude = toRadians(product.storeLongitude - from.longitude);
  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(product.storeLatitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const formatDistance = (distanceKm: number | null) => {
  if (distanceKm === null) return null;
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} м`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} км`;
};

const getLocationRecommendationBoost = (from: UserLocation | null, product: Product) => {
  const distanceKm = getDistanceKm(from, product);
  if (distanceKm === null) return 0;
  if (distanceKm <= 1) return 28;
  if (distanceKm <= 3) return 18;
  if (distanceKm <= 5) return 10;
  return 0;
};

const categoryVisuals: Array<{
  keywords: string[];
  image: string;
}> = [
  { keywords: ["ресторан", "restaurant", "мейрамхана"], image: "/categories-v3/restaurant.png" },
  { keywords: ["коф", "coffee"], image: "/categories-v3/coffee.png" },
  { keywords: ["кондитер", "confection"], image: "/categories-v3/confectionery.png" },
  { keywords: ["пекар", "bakery", "наубай"], image: "/categories-v3/bakery.png" },
  { keywords: ["клубник", "strawber", "құлпынай"], image: "/categories-v3/strawberry.png" },
  { keywords: ["слад", "sweet", "тәтті"], image: "/categories-v3/sweets.png" },
  { keywords: ["быстро", "fast", "жылдам"], image: "/categories-v3/fast-food.png" },
];

const getCategoryVisual = (name?: string) => {
  const normalizedName = safeString(name).normalize("NFC").toLowerCase();
  return (
    categoryVisuals.find((category) =>
      category.keywords.some((keyword) => normalizedName.includes(keyword.normalize("NFC").toLowerCase())),
    ) || { image: "/categories-v3/restaurant.png" }
  );
};

const getCategoryTranslationKey = (name?: string) => {
  const normalizedName = safeString(name).normalize("NFC").toLowerCase();

  if (["ресторан", "restaurant", "мейрамхана"].some((keyword) => normalizedName.includes(keyword))) return "categoryRestaurants";
  if (["коф", "coffee"].some((keyword) => normalizedName.includes(keyword))) return "categoryCoffee";
  if (["кондитер", "confection"].some((keyword) => normalizedName.includes(keyword))) return "categoryConfectionery";
  if (["пекар", "bakery", "наубай"].some((keyword) => normalizedName.includes(keyword))) return "categoryBakery";
  if (["клубник", "strawber", "құлпынай"].some((keyword) => normalizedName.includes(keyword))) return "categoryStrawberry";
  if (["слад", "sweet", "тәтті"].some((keyword) => normalizedName.includes(keyword))) return "categorySweets";
  if (["быстро", "fast", "жылдам"].some((keyword) => normalizedName.includes(keyword))) return "categoryFastFood";

  return null;
};

export default function HomePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isLoading: authLoading, login, error: authError } = useAuth();
  const { getTelegramInitData } = useTelegram();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categoriesResponse, isLoading: categoriesLoading } = useCategories();
  const {
    data: featuredProductsResponse,
    isLoading: productsLoading,
    refetch: refetchRecommendations,
  } = useRecommendedProducts(0, 100);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{ title: string; itemName: string } | null>(null);
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);
  const [recommendationVersion, setRecommendationVersion] = useState(0);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "denied" | "unsupported">("idle");
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);
  const [locationSavedForUserId, setLocationSavedForUserId] = useState<number | null>(null);

  const categories = safeArray(categoriesResponse).filter((category: Category) => category.active);
  const featuredProducts = rankProductsForRecommendations(safeArray(featuredProductsResponse?.content)
    .filter((product: Product) => isProductDisplayableInMiniApp(product))
    .map((product) => ({
      ...product,
      isFavorite: favoriteOverrides[product.id] ?? product.isFavorite,
    })), (product) => {
      void recommendationVersion;
      return getLocationRecommendationBoost(userLocation, product);
    });

  const toggleProductFavorite = async (product: Product) => {
    if (togglingProductId === product.id) return;

    const previousValue = !!product.isFavorite;
    setTogglingProductId(product.id);
    setFavoriteOverrides((prev) => ({ ...prev, [product.id]: !previousValue }));
    setToast({
      title: previousValue ? "Убрано из избранного" : "Добавлено в избранное",
      itemName: safeString(product.name),
    });
    try {
      await apiClient.toggleFavoriteProduct(product.id, previousValue);
    } catch (error) {
      console.error("Failed to toggle favorite product:", error);
      setFavoriteOverrides((prev) => ({ ...prev, [product.id]: previousValue }));
    } finally {
      setTogglingProductId(null);
    }
  };

  useEffect(() => {
    if (authLoading || user) return;

    const initData = getTelegramInitData();
    if (!initData) return;

    login(initData).catch((error) => {
      console.error("Telegram authentication failed:", error);
    });
  }, [authLoading, user, getTelegramInitData, login]);

  useEffect(() => {
    if (authLoading || !user) return;

    let isMounted = true;
    apiClient.getMyOrders()
      .then((orders) => {
        if (!isMounted) return;
        if (seedRecommendationsFromOrders(orders)) {
          setRecommendationVersion((version) => version + 1);
        }
      })
      .catch(() => {
        // Recommendations still work from local views/favorites when order history is unavailable.
      });

    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user?.id) return;

    void refetchRecommendations();
  }, [authLoading, user?.id, refetchRecommendations]);

  useEffect(() => {
    if (
      user?.lastLatitude === undefined
      || user.lastLongitude === undefined
      || !user.lastLocationUpdatedAt
      || userLocation
    ) {
      return;
    }

    const savedLocation = {
      latitude: user.lastLatitude,
      longitude: user.lastLongitude,
      accuracyMeters: user.lastLocationAccuracyMeters,
      updatedAt: user.lastLocationUpdatedAt,
    };
    if (!isLocationFresh(savedLocation)) return;

    setUserLocation(savedLocation);
    setLocationStatus("ready");
    localStorage.setItem("foodsaveLastLocation", JSON.stringify(savedLocation));
  }, [user, userLocation]);

  useEffect(() => {
    if (!user?.id || !userLocation || locationSavedForUserId === user.id) return;

    apiClient.updateMyLocation(
      userLocation.latitude,
      userLocation.longitude,
      userLocation.accuracyMeters,
    )
      .then(() => setLocationSavedForUserId(user.id))
      .catch((error) => {
        console.error("Failed to sync saved user location:", error);
      });
  }, [user, userLocation, locationSavedForUserId]);

  useEffect(() => {
    const sessionId = sessionStorage.getItem("foodsaveSessionId") || crypto.randomUUID();
    sessionStorage.setItem("foodsaveSessionId", sessionId);
    apiClient.trackEvent({
      eventType: "MINI_APP_OPENED",
      sessionId,
      source: "direct",
      idempotencyKey: `mini-app-opened-${sessionId}`,
    });
    apiClient.trackEvent({
      eventType: "HOME_VIEWED",
      sessionId,
      source: "direct",
      idempotencyKey: `home-viewed-${sessionId}-${Date.now()}`,
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedLocation = readSavedLocation();
    if (storedLocation) {
      setUserLocation(storedLocation);
      setLocationStatus("ready");
    }
  }, []);

  useEffect(() => {
    if (!locationFeedback) return;
    const timeoutId = window.setTimeout(() => setLocationFeedback(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [locationFeedback]);

  const requestUserLocation = async () => {
    setLocationFeedback(null);
    setLocationStatus("loading");
    try {
      const nextLocation = await requestCurrentLocation();
      setUserLocation(nextLocation);
      setLocationStatus("ready");
      setLocationFeedback(
        featuredProducts.some((product) => canReserveProduct(product))
          ? "Показываем ближайшие боксы"
          : "Рядом пока нет доступных боксов",
      );

      if (user) {
        apiClient.updateMyLocation(
          nextLocation.latitude,
          nextLocation.longitude,
          nextLocation.accuracyMeters,
        )
          .then(() => setLocationSavedForUserId(user.id))
          .catch((error) => console.error("Failed to sync current user location:", error));
      }
    } catch (error) {
      setLocationStatus(error instanceof Error && error.message === "LOCATION_DENIED" ? "denied" : "unsupported");
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = searchQuery.trim();
    const sessionId = sessionStorage.getItem("foodsaveSessionId") || undefined;
    apiClient.trackEvent({
      eventType: "SEARCH_PERFORMED",
      sessionId,
      source: "search",
      metadata: { searchQuery: query },
    });
    router.push(query ? `/markets?query=${encodeURIComponent(query)}` : "/markets");
  };

  const FeaturedProductCard = ({ product }: { product: Product }) => {
    const isFavorite = !!product.isFavorite;
    const isTogglingFavorite = togglingProductId === product.id;
    const price = getCurrentPrice(product);
    const originalPrice = normalizePrice(product.originalPrice || price);
    const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : product.discountPercentage || 0;
    const distanceLabel = formatDistance(getDistanceKm(userLocation, product));
    const isReservable = canReserveProduct(product);

    return (
      <Link href={`/details/${product.id}`} className="min-w-0">
        <article>
          <div className="relative h-36 overflow-hidden rounded-2xl bg-gray-100 md:h-48 xl:h-52">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={safeString(product.name)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#4CAD73]">
                <span className="text-xl font-bold text-white font-inter">FS</span>
              </div>
            )}
            {discount > 0 && (
              <div className="absolute left-2 top-2 rounded-full bg-[#E5484D] px-3 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-red-500/25 backdrop-blur font-inter">
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
          <h3 className="mt-3 truncate text-base font-bold text-black font-inter">{safeString(product.name)}</h3>
          <p className="mt-1 truncate text-sm text-black/50 font-inter">
            {safeString(product.storeName) || "FoodSave"}{distanceLabel ? ` • ${distanceLabel}` : ""}
          </p>
          {product.closingSoon && (
            <div className="mt-1">
              <ClosingSoonBadge minutes={product.closingSoonMinutes} />
            </div>
          )}
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-base font-bold font-inter ${isReservable ? "text-[#4CAD73]" : "text-black/55"}`}>
              {formatPrice(price)}
            </span>
            {originalPrice > price && (
              <span className="text-sm text-black/35 line-through font-inter">{formatPrice(originalPrice)}</span>
            )}
          </div>
        </article>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-32" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <header className="mx-auto w-full max-w-7xl px-4 pt-3 md:px-8 md:pt-6 xl:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/foodsave-logo.png"
              alt="FoodSave"
              className="h-7 w-auto max-w-[155px] object-contain md:h-8 md:max-w-[180px]"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              aria-label="Уведомления"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-[0_4px_14px_rgba(20,45,24,0.08)] transition-all active:scale-95 active:shadow-sm"
            >
              <svg className="h-5 w-5 text-black/65" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a3 3 0 006 0" />
              </svg>
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          className="mt-4 flex h-12 items-center gap-2.5 rounded-xl border border-black/[0.07] bg-white px-3.5 shadow-[0_4px_16px_rgba(20,45,24,0.06)] transition-all focus-within:border-[#4CAD73]/50 focus-within:shadow-[0_5px_18px_rgba(76,173,115,0.14)] md:mt-6 md:h-14 md:max-w-3xl"
        >
          <button type="submit" className="flex h-7 w-7 items-center justify-center" aria-label={t("search")}>
            <svg className="h-5 w-5 text-black/35" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-black outline-none placeholder:text-black/40 font-inter"
            placeholder={t("searchPlaceholder")}
            type="search"
          />
        </form>

        {authError && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{authError}</p>
          </div>
        )}
      </header>

      <section className="mx-auto mt-5 w-full max-w-7xl bg-white py-3 md:mt-7 md:px-8 xl:px-10">
        <div className="overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max snap-x snap-mandatory gap-2 pr-1 md:gap-4">
            {categoriesLoading
              ? [1, 2, 3].map((item) => (
                  <div key={item} className="flex w-[80px] flex-col items-center gap-2 md:w-[96px]">
                    <div className="h-20 w-20 animate-pulse rounded-2xl bg-black/5 md:h-24 md:w-24" />
                    <div className="h-4 w-16 animate-pulse rounded bg-black/5" />
                  </div>
                ))
              : categories.map((category) => {
                  const translatedCategoryKey = getCategoryTranslationKey(category.name);
                  const categoryLabel = translatedCategoryKey ? t(translatedCategoryKey) : safeString(category.name);
                  const categoryVisual = getCategoryVisual(category.name);

                  return (
                    <Link
                      key={category.id}
                      href={`/markets?view=products&categoryId=${category.id}`}
                      className="flex w-[80px] shrink-0 snap-start flex-col items-center gap-1 md:w-[96px]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={categoryVisual.image}
                        alt=""
                        aria-hidden="true"
                        className="h-20 w-20 object-contain drop-shadow-[0_5px_11px_rgba(0,0,0,0.12)] md:h-24 md:w-24"
                      />
                      <span className="w-full whitespace-nowrap text-center text-xs font-semibold leading-4 text-black/80 font-inter md:text-sm">
                        {categoryLabel}
                      </span>
                    </Link>
                  );
                })}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 pt-5 md:px-8 md:pt-8 xl:px-10">
        <div className="relative h-36 overflow-hidden rounded-3xl bg-[#f5f7f4] shadow-[0_8px_24px_rgba(20,45,24,0.08)] md:h-64 lg:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/map/map.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/10" />

          {locationFeedback && (
            <div
              role="status"
              className="absolute left-1/2 top-3 max-w-[calc(100%-24px)] -translate-x-1/2 rounded-full bg-[#4CAD73] px-4 py-2 text-center text-xs font-bold text-white shadow-[0_8px_24px_rgba(76,173,115,0.22)] font-inter"
            >
              {locationFeedback}
            </div>
          )}

          <button
            type="button"
            onClick={requestUserLocation}
            disabled={locationStatus === "loading"}
            className="absolute bottom-3 left-3 inline-flex h-11 max-w-[62%] items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-[#4CAD73] shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition-transform active:scale-[0.97] disabled:opacity-80 font-inter md:bottom-5 md:left-5 md:h-12 md:px-5 md:text-base"
          >
            {locationStatus === "loading" ? (
              <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">
              {locationStatus === "loading" && "Определяем..."}
              {locationStatus === "ready" && "Рядом с вами"}
              {locationStatus === "denied" && "Разрешить доступ"}
              {locationStatus === "unsupported" && "Попробовать снова"}
              {locationStatus === "idle" && "Найти рядом"}
            </span>
          </button>

          <Link
            href="/map"
            aria-label="Открыть карту"
            className="absolute bottom-3 right-3 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-[#E5484D] shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition-transform active:scale-[0.97] font-inter md:bottom-5 md:right-5 md:h-12 md:px-5 md:text-base"
          >
            <MapPin className="h-4 w-4" />
            {t("map")}
          </Link>
        </div>

        <section className="mt-8 md:mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-black font-inter">{t("recommendedForYou")}</h2>
            <Link href="/markets?view=products" className="flex items-center gap-1 text-base font-semibold text-[#4CAD73] font-inter">
              {t("seeAll")}
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="animate-pulse">
                  <div className="h-36 rounded-2xl bg-gray-100 md:h-48 xl:h-52" />
                  <div className="mt-3 h-5 rounded bg-gray-100" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="flex items-center gap-3 border-y border-black/[0.06] py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDF7F0] text-[#4CAD73]">
                <PackageOpen className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black font-inter">{t("nearbyBoxes")}</p>
                <p className="mt-0.5 text-xs leading-4 text-black/50 font-inter">
                  {t("noBoxesAvailable")}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-x-6 md:gap-y-8 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <FeaturedProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <a
          href="https://t.me/FoodSave_kz"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex items-center justify-between gap-4 rounded-2xl bg-[#4CAD73] px-4 py-3.5 text-white shadow-[0_8px_24px_rgba(76,173,115,0.20)] active:scale-[0.99] transition-transform md:mt-10 md:px-6 md:py-5"
        >
          <div className="min-w-0">
            <p className="text-base font-bold font-inter">{t("becomePartner")}</p>
            <p className="mt-0.5 truncate text-xs font-medium text-white/70 font-inter">
              {t("partnerDescription")}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/80" />
        </a>
      </main>

      <BottomNav active="home" />
      <FavoriteToast title={toast?.title ?? null} itemName={toast?.itemName} onClose={() => setToast(null)} />
    </div>
  );
}
