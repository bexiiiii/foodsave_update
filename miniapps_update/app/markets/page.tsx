"use client";

import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Clock, Star } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTelegram } from "../../hooks/useTelegram";
import { apiClient, isProductVisibleInMiniApp, NotificationGroup, Product, Store } from "../../lib/api";
import { formatPrice } from "../../lib/pricing";
import BackButton from "../../components/BackButton";
import FavoriteToast from "../../components/FavoriteToast";

function MarketsContent() {
  const { } = useTelegram(); // Initialize Telegram singleton
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim() || "";
  const categoryId = searchParams.get("categoryId")?.trim() || "";
  const notificationGroupId = searchParams.get("notificationGroupId")?.trim() || "";
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notificationGroup, setNotificationGroup] = useState<NotificationGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ title: string; itemName: string } | null>(null);
  const [togglingStoreId, setTogglingStoreId] = useState<number | null>(null);

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
            apiClient.searchProducts(query, 0, 50),
          ]);
          setStores(storesResult.content);
          setProducts(productsResult.content.filter(isProductVisibleInMiniApp));
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
  }, [query, categoryId, notificationGroupId]);

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
              <span className="inline-flex items-center gap-1 mt-2 text-[12px] font-medium text-[#FF9500] bg-[#FF9500]/10 rounded-full px-2.5 py-1 font-inter">
                <Clock className="w-3 h-3" />
                Закрывается через час
              </span>
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

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <BackButton fallback="/" />
          <h1 className="text-xl font-bold text-black font-inter">
            {notificationGroup ? "Подборка FoodSave" : query ? `Поиск: ${query}` : "Заведения"}
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
                <h2 className="pt-3 text-lg font-bold text-black font-inter">Боксы</h2>
                <div className="grid grid-cols-2 gap-4">
                  {products.map((product) => {
                    const price = product.price || product.discountedPrice || product.originalPrice || 0;
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
                          </div>
                          <h3 className="mt-2 truncate text-sm font-bold text-black font-inter">{product.name}</h3>
                          <p className="mt-1 truncate text-xs text-black/50 font-inter">{product.storeName || "FoodSave"}</p>
                          <p className="mt-1 text-sm font-bold text-[#15551F] font-inter">{formatPrice(price)}</p>
                        </article>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
            
            {stores.length === 0 && products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-black/50 font-inter">
                  {query ? "По вашему запросу ничего не найдено" : "Заведения не найдены"}
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
