"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { useTelegram } from "../../hooks/useTelegram";
import { apiClient, Store } from "../../lib/api";

export default function MarketsPage() {
  const { } = useTelegram(); // Initialize Telegram singleton
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const storesData = await apiClient.getActiveStores();
        setStores(storesData);
      } catch (error) {
        console.error('Failed to load stores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStores();
  }, []);

  const formatOpeningHours = (store: Store) => {
    if (store.openingHours && store.closingHours) {
      return `${store.openingHours} - ${store.closingHours}`;
    }
    if (store.openingHours) {
      return `${store.openingHours} - 22:00`;
    }
    return "9:00 - 22:00";
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">Заведения</h1>
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
            {stores.map((store) => (
              <Link 
                key={store.id} 
                href={`/boxes?storeId=${store.id}`}
                className="block bg-gray-100 rounded-2xl p-4 hover:bg-gray-200 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Store Logo */}
                  <div className="w-16 h-16 bg-[#73be61] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                  
                  {/* Store Info */}
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
                  </div>
                  
                  {/* Rating */}
                  {store.rating && (
                    <div className="flex items-center gap-1 bg-[#73be61] rounded-lg px-2 py-1">
                      <span className="text-white text-sm font-medium font-inter">
                        {store.rating.toFixed(1)}
                      </span>
                      <span className="text-white text-xs">★</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
            
            {stores.length === 0 && (
              <div className="text-center py-12">
                <p className="text-black/50 font-inter">Заведения не найдены</p>
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
            <div className="w-12 h-12 bg-[#73be61] rounded-xl flex items-center justify-center">
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
    </div>
  );
}
