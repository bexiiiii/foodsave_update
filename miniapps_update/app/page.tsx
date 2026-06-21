"use client";

import { useEffect, useState } from "react";
import { Bell, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../hooks/useTranslation";
import { useAuth } from "../hooks/useAuth";
import { useTelegram } from "../hooks/useTelegram";
import { useFeaturedProducts, useOrders } from "../hooks/useData";
import { safeString } from "../lib/utils";
import { safeArray } from "../lib/api";
import { Product, isProductVisibleInMiniApp } from "../lib/api";
import BottomNavigation from "../components/BottomNavigation";
import { getStatusText, isActiveOrder, sortOrdersByCreatedAtDesc } from "../lib/orders";

export default function HomePage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading, login, error: authError } = useAuth();
  const { getTelegramUser, getTelegramInitData } = useTelegram();
  const [currentBanner, setCurrentBanner] = useState(0);
  const [userName, setUserName] = useState("");
  const [authInitialized, setAuthInitialized] = useState(false);

  // Use safe hooks for data fetching
  const { data: featuredProductsResponse, isLoading: productsLoading } = useFeaturedProducts(0, 5);
  const { orders, isLoading: ordersLoading } = useOrders();

  const banners = [
    { id: 1, title: t("foodWithDiscount"), subtitle: t("upTo80"), color: "#de8a08" },
    { id: 2, title: t("freeDelivery"), subtitle: t("from2000"), color: "#73be61" },
    { id: 3, title: t("newRestaurants"), subtitle: t("everyDay"), color: "#ff6b6b" },
  ];

  // Get featured products safely
  const featuredProducts = safeArray(featuredProductsResponse?.content)
    .filter((product: Product) => isProductVisibleInMiniApp(product));
  
  const activeOrder = sortOrdersByCreatedAtDesc(safeArray(orders).filter(isActiveOrder))[0] || null;

  // Initialize Telegram authentication
  useEffect(() => {
    if (authInitialized || authLoading) return;

    const initializeAuth = async () => {
      // Get user name from Telegram
      const telegramUser = getTelegramUser();
      if (telegramUser) {
        const fullName = `${safeString(telegramUser.first_name)} ${safeString(telegramUser.last_name)}`.trim();
        setUserName(fullName || safeString(telegramUser.username) || 'Пользователь');
      }

      // Authenticate user with Telegram (only if not already authenticated)
      const initData = getTelegramInitData();
      if (initData && !user) {
        try {
          await login(initData);
        } catch (error) {
          console.error('Telegram authentication failed:', error);
          // Don't throw error, app should still work without auth
        }
      }

      setAuthInitialized(true);
    };

    initializeAuth();
  }, [authInitialized, authLoading, user, getTelegramUser, getTelegramInitData, login]);

  // Banner auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-black/50 font-medium font-inter">{t("welcome")}</p>
            <h1 className="text-lg font-bold text-black mt-1 font-inter">
              {userName || safeString(user?.firstName) || safeString(user?.telegramUsername) || t("userName")}
            </h1>
          </div>
          <Link href="/notifications" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Auth Error Display */}
      {authError && (
        <div className="px-4 mt-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{authError}</p>
          </div>
        </div>
      )}

      {/* Discount Banner - Carousel */}
      <div className="px-4 mt-6">
        <div className="relative overflow-hidden rounded-2xl h-[100px]">
          <div 
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${currentBanner * 100}%)` }}
          >
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="min-w-full h-full rounded-2xl p-5 relative overflow-hidden flex-shrink-0"
                style={{ backgroundColor: banner.color }}
              >
                <h2 className="text-white text-xl font-semibold leading-tight font-inter">
                  {banner.title}<br />{banner.subtitle}
                </h2>
                <button className="absolute top-4 right-4">
                  <ArrowUpRight className="w-5 h-5 text-white" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Carousel Indicators */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`h-1 rounded-full transition-all ${
                  index === currentBanner 
                    ? 'w-4 bg-white' 
                    : 'w-1 bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* My Orders */}
      <div className="sticky top-0 z-30 px-4 mt-8 bg-white/95 py-2 shadow-sm backdrop-blur">
        <Link
          href={activeOrder ? `/orders/${activeOrder.id}` : "/orders"}
          className="block bg-gray-100 rounded-2xl p-5 relative transition-transform active:scale-[0.99]"
        >
          <p className="text-black/50 text-base font-medium font-inter">{t("myOrders")}</p>
          
          {ordersLoading ? (
            <div className="mt-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded mt-2 w-1/2 animate-pulse"></div>
            </div>
          ) : activeOrder ? (
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-black font-inter">
                  {safeString(activeOrder.storeName)}
                </h3>
                <div className="bg-[#73be61] rounded-2xl px-4 py-1">
                  <span className="text-white text-sm font-medium font-inter">
                    {getStatusText(activeOrder.status)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-black/60 font-inter mt-1">
                {new Date(activeOrder.createdAt).toLocaleDateString()} • {activeOrder.totalAmount || activeOrder.total || 0}₸
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <h3 className="text-lg text-black/60 font-inter">{t("noOrders")}</h3>
              <p className="text-sm text-black/40 font-inter mt-1">{t("makeFirstOrder")}</p>
            </div>
          )}
          
          <span className="absolute bottom-4 right-5 text-xs text-black/50 font-inter">
            {t("allOrders")}
          </span>
        </Link>
      </div>

      {/* Nearby boxes */}
      <div className="px-4 mt-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-black font-inter">{t("nearbyBoxes")}</h3>
          <Link href="/markets" className="text-base font-semibold text-[#73be61] font-inter">
            {t("seeAll")}
          </Link>
        </div>
        
        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-4">
            {featuredProducts.length > 0 ? featuredProducts.map((product: Product) => (
              <Link key={product.id} href={`/details/${product.id}`} className="flex-shrink-0 w-[250px]">
                <div className="bg-gray-100 rounded-2xl p-4">
                  <h4 className="text-lg font-medium text-black font-inter">{safeString(product.name)}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-black/60 font-inter">
                    <span>{product.stockQuantity} {t("meals")}</span>
                    <span>{safeString(product.storeName)}</span>
                  </div>
                  <div className="bg-[#73be61] rounded-2xl h-32 mt-4 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={safeString(product.name)}
                        className="w-full h-full object-cover rounded-2xl"
                        onError={(e) => {
                          // Replace with placeholder on error
                          (e.target as HTMLImageElement).src = '/placeholder-food.jpg';
                        }}
                      />
                    ) : (
                      <div className="text-white text-sm font-inter">Фото</div>
                    )}
                  </div>
                </div>
              </Link>
            )) : !productsLoading ? (
              <div className="flex-shrink-0 w-[250px]">
                <div className="bg-gray-100 rounded-2xl p-4">
                  <h4 className="text-lg font-medium text-black font-inter">{t("donerNaAbaya")}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-black/60 font-inter">
                    <span>15 {t("meals")}</span>
                    <span>{t("kabanbayBatyra")}</span>
                  </div>
                  <div className="bg-[#73be61] rounded-2xl h-32 mt-4"></div>
                </div>
              </div>
            ) : (
              // Loading skeleton
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-shrink-0 w-[250px]">
                    <div className="bg-gray-100 rounded-2xl p-4 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded mt-2 w-3/4"></div>
                      <div className="bg-gray-200 rounded-2xl h-32 mt-4"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
