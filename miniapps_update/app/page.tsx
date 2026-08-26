"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ChevronRight,
  LocateFixed,
  MapPin,
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
import { useCategories, useFeaturedProducts } from "../hooks/useData";
import { safeString } from "../lib/utils";
import { safeArray } from "../lib/api";
import { apiClient, Category, Product, isProductVisibleInMiniApp } from "../lib/api";
import { getProductRecommendationScore, seedRecommendationsFromOrders } from "../lib/personalization";
import { formatPrice, normalizePrice } from "../lib/pricing";
import { readSavedLocation, requestCurrentLocation, UserLocation } from "../lib/location";

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
  const { data: featuredProductsResponse, isLoading: productsLoading } = useFeaturedProducts(0, 100);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{ title: string; itemName: string } | null>(null);
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);
  const [recommendationVersion, setRecommendationVersion] = useState(0);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "denied" | "unsupported">("idle");
  const [locationSavedForUserId, setLocationSavedForUserId] = useState<number | null>(null);

  const categories = safeArray(categoriesResponse).filter((category: Category) => category.active);
  const featuredProducts = safeArray(featuredProductsResponse?.content)
    .filter((product: Product) => isProductVisibleInMiniApp(product))
    .map((product) => ({
      ...product,
      isFavorite: favoriteOverrides[product.id] ?? product.isFavorite,
    }))
    .sort((a, b) => {
      void recommendationVersion;
      const aScore = getProductRecommendationScore(a) + getLocationRecommendationBoost(userLocation, a);
      const bScore = getProductRecommendationScore(b) + getLocationRecommendationBoost(userLocation, b);
      const scoreDiff = bScore - aScore;
      if (scoreDiff !== 0) return scoreDiff;

      const aDistance = getDistanceKm(userLocation, a);
      const bDistance = getDistanceKm(userLocation, b);
      if (aDistance !== null && bDistance !== null) return aDistance - bDistance;
      if (aDistance !== null) return -1;
      if (bDistance !== null) return 1;
      return 0;
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
    if (
      user?.lastLatitude === undefined
      || user.lastLongitude === undefined
      || userLocation
    ) {
      return;
    }

    const savedLocation = {
      latitude: user.lastLatitude,
      longitude: user.lastLongitude,
      accuracyMeters: user.lastLocationAccuracyMeters,
      updatedAt: user.lastLocationUpdatedAt || new Date().toISOString(),
    };
    setUserLocation(savedLocation);
    setLocationStatus("ready");
    localStorage.setItem("foodsaveLastLocation", JSON.stringify(savedLocation));
  }, [user, userLocation]);

  useEffect(() => {
    if (!user?.id || !userLocation || locationSavedForUserId === user.id) return;

    apiClient.updateMyLocation(userLocation.latitude, userLocation.longitude)
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

  const requestUserLocation = async () => {
    setLocationStatus("loading");
    try {
      const nextLocation = await requestCurrentLocation();
      setUserLocation(nextLocation);
      setLocationStatus("ready");

      if (user) {
        await apiClient.updateMyLocation(
          nextLocation.latitude,
          nextLocation.longitude,
          nextLocation.accuracyMeters,
        );
        setLocationSavedForUserId(user.id);
      }

      router.push("/map?focus=user");
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

    return (
      <Link href={`/details/${product.id}`} className="min-w-0">
        <article>
          <div className="relative h-36 overflow-hidden rounded-2xl bg-gray-100">
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
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center transition-transform active:scale-90"
            >
              <Star
                className={`h-5 w-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] ${isFavorite ? "text-amber-400" : "text-white"}`}
                fill={isFavorite ? "currentColor" : "none"}
              />
            </button>
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
            <span className="text-base font-bold text-[#15551F] font-inter">{formatPrice(price)}</span>
            {originalPrice > price && (
              <span className="text-sm text-black/35 line-through font-inter">{formatPrice(originalPrice)}</span>
            )}
          </div>
        </article>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-24" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <header className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-[#15551F] font-inter">FoodSave</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
              <svg className="h-6 w-6 text-black/70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a3 3 0 006 0" />
              </svg>
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-5 flex h-14 items-center gap-3 rounded-2xl bg-gray-100 px-4">
          <button type="submit" className="flex h-8 w-8 items-center justify-center" aria-label={t("search")}>
            <svg className="h-6 w-6 text-black/35" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-black outline-none placeholder:text-black/45 font-inter"
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

      <section className="mt-6 bg-white py-4">
        <div className="overflow-x-auto px-4 pb-1">
          <div className="flex min-w-max gap-5">
            {categoriesLoading
              ? [1, 2, 3].map((item) => (
                  <div key={item} className="flex w-[68px] flex-col items-center gap-2">
                    <div className="h-14 w-14 animate-pulse rounded-full bg-black/5" />
                    <div className="h-4 w-14 animate-pulse rounded bg-black/5" />
                  </div>
                ))
              : categories.map((category) => {
                  const translatedCategoryKey = getCategoryTranslationKey(category.name);
                  const categoryLabel = translatedCategoryKey ? t(translatedCategoryKey) : safeString(category.name);
                  const categoryVisual = getCategoryVisual(category.name);

                  return (
                    <Link key={category.id} href={`/markets?view=products&categoryId=${category.id}`} className="flex w-[74px] flex-col items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={categoryVisual.image}
                        alt=""
                        aria-hidden="true"
                        className="h-14 w-14 object-contain"
                      />
                      <span className="w-full truncate text-center text-sm font-medium text-black/80 font-inter">
                        {categoryLabel}
                      </span>
                    </Link>
                  );
                })}
          </div>
        </div>
      </section>

      <main className="px-4 pt-5">
        <Link
          href="/map"
          className="block overflow-hidden rounded-3xl bg-[#FFF1F1] p-3 shadow-sm"
        >
          <div className="relative h-32 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/map/map.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/35 via-white/5 to-transparent" />
            <div className="relative flex h-full items-end justify-end p-3">
              <div className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-[#E5484D] shadow-lg shadow-black/10 font-inter">
                <MapPin className="h-4 w-4" />
                {t("map")}
              </div>
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={requestUserLocation}
          disabled={locationStatus === "loading"}
          className="mt-3 flex h-12 w-full items-center justify-between rounded-2xl bg-gray-100 px-4 text-left transition-colors active:bg-gray-200 disabled:opacity-70"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white">
              <LocateFixed className="h-4 w-4 text-[#15551F]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-black font-inter">
                {locationStatus === "ready" ? "Показываем ближе к вам" : "Найти боксы рядом"}
              </span>
              <span className="block truncate text-xs font-medium text-black/45 font-inter">
                {locationStatus === "loading" && "Определяем местоположение..."}
                {locationStatus === "denied" && "Доступ не дали, можно попробовать еще раз"}
                {locationStatus === "unsupported" && "Телефон не отдал геолокацию"}
                {(locationStatus === "idle" || locationStatus === "ready") && "Без истории перемещений, только последняя точка"}
              </span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-black/35" />
        </button>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-black font-inter">{t("recommendedForYou")}</h2>
            <Link href="/markets?view=products" className="flex items-center gap-1 text-base font-semibold text-[#15551F] font-inter">
              {t("seeAll")}
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="animate-pulse">
                  <div className="h-36 rounded-2xl bg-gray-100" />
                  <div className="mt-3 h-5 rounded bg-gray-100" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="rounded-2xl bg-gray-100 p-5">
              <p className="text-base font-semibold text-black font-inter">{t("nearbyBoxes")}</p>
              <p className="mt-1 text-sm text-black/50 font-inter">
                {t("noBoxesAvailable")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
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
          className="mt-8 flex items-center justify-between gap-4 rounded-2xl bg-[#15551F] px-4 py-3.5 text-white shadow-sm active:scale-[0.99] transition-transform"
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
