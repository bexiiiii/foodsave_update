"use client";

import { useEffect, useState, Suspense } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTelegram } from "../../hooks/useTelegram";
import { apiClient, Product, Store, isProductVisibleInMiniApp } from "../../lib/api";

function BoxesContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId');
  const { } = useTelegram(); // Initialize Telegram singleton
  
  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const filterAvailableProducts = (items: Product[] = []) =>
    items.filter((product) => isProductVisibleInMiniApp(product));

  useEffect(() => {
    let isMounted = true;
    let loadingStarted = false;

    const loadData = async () => {
      if (!storeId || loadingStarted) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }
      loadingStarted = true;

      try {
        // Load store info
        const storeData = await apiClient.getStoreById(Number(storeId));
        if (isMounted) {
          setStore(storeData);
        }

        // Load products for this store
        const productsResponse = await apiClient.getProductsByStore(Number(storeId), 0, 100);
        if (isMounted) {
          const filteredProducts = filterAvailableProducts(productsResponse.content);
          setProducts(filteredProducts);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  const formatPrice = (price: number) => {
    return `${price.toLocaleString()} ₸`;
  };

  const formatOpeningHours = (hours: string | undefined) => {
    if (!hours) return "9:00 - 22:00";
    return hours;
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/markets" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
           <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">Продукты</h1>
        </div>
      </div>

      {/* Store Info */}
      {store && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-black font-inter">{store.name}</h2>
            <div className="flex items-center gap-2 text-sm text-black/60 font-inter">
              <Clock className="w-4 h-4" />
              <span>
                {formatOpeningHours(store.openingHours)}
                {store.closingHours ? ` — ${store.closingHours}` : ""}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="px-4 mt-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-2xl aspect-square"></div>
                <div className="mt-2">
                  <div className="h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/details/${product.id}`}
                className="block hover:scale-105 transition-transform duration-200"
              >
                <div className="bg-gray-100 rounded-2xl p-3 aspect-square relative overflow-hidden">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#73be61] rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl font-bold font-inter">FS</span>
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  {product.discountPercentage && product.discountPercentage > 0 && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg font-inter">
                      -{product.discountPercentage}%
                    </div>
                  )}
                  
                  {/* Stock Indicator */}
                  {product.stockQuantity <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold font-inter">Нет в наличии</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-2">
                  <p className="text-sm font-medium text-black font-inter line-clamp-2">{product.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {product.discountPercentage && product.discountPercentage > 0 ? (
                      <>
                        <p className="text-base font-bold text-black font-inter">
                          {formatPrice(product.price || product.discountedPrice || product.originalPrice)}
                        </p>
                        <p className="text-sm text-black/50 line-through font-inter">
                          {formatPrice(product.originalPrice)}
                        </p>
                      </>
                    ) : (
                      <p className="text-base font-bold text-black font-inter">
                        {formatPrice(product.price || product.originalPrice)}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-black/50 font-inter mt-1">
                    Осталось: {product.stockQuantity}
                  </p>
                </div>
              </Link>
            ))}
            
            {products.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p className="text-black/50 font-inter">В этом заведении пока нет продуктов</p>
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
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/markets" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">Продукты</h1>
        </div>
      </div>
      
      {/* Loading skeleton */}
      <div className="px-4 mt-6">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-2xl aspect-square"></div>
              <div className="mt-2">
                <div className="h-4 bg-gray-200 rounded mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';

export default function BoxesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BoxesContent />
    </Suspense>
  );
}
