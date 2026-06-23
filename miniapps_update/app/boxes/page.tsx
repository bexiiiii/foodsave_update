"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { ArrowLeft, Clock, Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import LinkComponent from "next/link";
import { useTelegram } from "../../hooks/useTelegram";
import { apiClient, Product, Store, isProductVisibleInMiniApp } from "../../lib/api";

function BoxesContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId');
  const { } = useTelegram();

  // Состояния для данных
  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Состояния загрузки и пагинации
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Базовые состояния фильтров
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);

  // Расширенные состояния фильтров
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minDiscountSize, setMinDiscountSize] = useState<number | null>(null);

  // Ссылка для Intersection Observer (бесконечный скролл)
  const observerTarget = useRef<HTMLDivElement>(null);

  // Debounce для текстового поиска (500мс)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Загрузка категорий (один раз)
  useEffect(() => {
    apiClient.getAllCategories().then(data => {
      if (data && data.length > 0) setCategories(data);
    });
  }, []);

  // Основная функция загрузки продуктов
  const loadProducts = useCallback(async (pageNumber: number, replace = false) => {
    setIsFetchingMore(true);
    try {
      let response;
      if (storeId) {
        // Если мы на странице конкретного заведения
        if (pageNumber === 0) {
          const storeData = await apiClient.getStoreById(Number(storeId));
          setStore(storeData);
        }
        response = await apiClient.getProductsByStore(Number(storeId), pageNumber, 12);
      } else {
        // Общий каталог со ВСЕМИ динамическими фильтрами (БЕЗ ГЕО)
        response = await apiClient.filterProducts({
          query: searchQuery || undefined,
          categoryName: selectedCategory || undefined,
          inStock: inStockOnly || undefined,
          minDiscount: minDiscountSize !== null ? minDiscountSize : (saleOnly ? 1 : undefined),
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          page: pageNumber,
          size: 12
        });
      }

      const newProducts = response.content.filter((product) => isProductVisibleInMiniApp(product));

      setProducts(prev => {
        if (replace) return newProducts;
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = newProducts.filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });
      setHasMore(!response.last);

    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsFetchingMore(false);
      setIsLoading(false);
    }
  }, [storeId, searchQuery, selectedCategory, inStockOnly, saleOnly, minPrice, maxPrice, minDiscountSize]);

  // Перезагрузка при смене любых фильтров
  useEffect(() => {
    setPage(0);
    setIsLoading(true);
    loadProducts(0, true);
  }, [loadProducts]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasMore && !isFetchingMore && !isLoading) {
            setPage(prev => {
              const nextPage = prev + 1;
              loadProducts(nextPage, false);
              return nextPage;
            });
          }
        },
        { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, isLoading, loadProducts]);

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return "0 ₸";
    return `${price.toLocaleString()} ₸`;
  };

  return (
      <div className="min-h-screen bg-white pb-24" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-4 mb-4">
            <LinkComponent href={storeId ? "/markets" : "/"} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
              <ArrowLeft className="w-5 h-5 text-gray-800" />
            </LinkComponent>
            <h1 className="text-xl font-bold text-black font-inter">
              {storeId ? "Меню заведения" : "Все боксы"}
            </h1>
          </div>

          {/* Блок фильтров общего каталога */}
          {!storeId && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Поиск любимой еды..."
                        className="w-full bg-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-inter outline-none focus:ring-2 focus:ring-[#73be61]/50 transition-all"
                    />
                  </div>
                  <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${showFilters ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Выпадающая расширенная панель фильтрации */}
                {showFilters && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4 transition-all duration-300">
                      {/* Фильтр по цене */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase font-inter block mb-1.5">Цена (₸)</label>
                        <div className="flex gap-2 items-center">
                          <input
                              type="number"
                              placeholder="От"
                              value={minPrice}
                              onChange={(e) => setMinPrice(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl py-1.5 px-3 text-sm outline-none focus:border-[#73be61] text-black"
                          />
                          <span className="text-gray-400">—</span>
                          <input
                              type="number"
                              placeholder="До"
                              value={maxPrice}
                              onChange={(e) => setMaxPrice(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl py-1.5 px-3 text-sm outline-none focus:border-[#73be61] text-black"
                          />
                        </div>
                      </div>

                      {/* Фильтр по размеру скидки */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase font-inter block mb-1.5">Размер скидки</label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: 'Любая', value: null },
                            { label: '> 10%', value: 10 },
                            { label: '> 30%', value: 30 },
                            { label: '> 50%', value: 50 }
                          ].map((opt) => (
                              <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() => setMinDiscountSize(opt.value)}
                                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${minDiscountSize === opt.value ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-black'}`}
                              >
                                {opt.label}
                              </button>
                          ))}
                        </div>
                      </div>

                      {/* Сброс параметров */}
                      <div className="flex justify-end pt-1">
                        <button
                            type="button"
                            onClick={() => {
                              setMinPrice("");
                              setMaxPrice("");
                              setMinDiscountSize(null);
                            }}
                            className="text-xs text-gray-500 underline font-medium hover:text-black"
                        >
                          Сбросить фильтры
                        </button>
                      </div>
                    </div>
                )}

                {/* Горизонтальный скролл быстрых чипсов */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${!selectedCategory ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}
                  >
                    Все
                  </button>
                  <button
                      onClick={() => setInStockOnly(!inStockOnly)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${inStockOnly ? 'bg-[#73be61] text-white' : 'bg-gray-100 text-black'}`}
                  >
                    В наличии
                  </button>
                  <button
                      onClick={() => setSaleOnly(!saleOnly)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${saleOnly && minDiscountSize === null ? 'bg-red-500 text-white' : 'bg-gray-100 text-black'}`}
                  >
                    Со скидкой
                  </button>
                  {categories.map(cat => (
                      <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}
                      >
                        {cat}
                      </button>
                  ))}
                </div>
              </div>
          )}
        </div>

        {/* Инфо о заведении (если передано) */}
        {store && storeId && (
            <div className="px-4 mt-2 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black font-inter">{store.name}</h2>
                <div className="flex items-center gap-2 text-sm text-black/60 font-inter">
                  <Clock className="w-4 h-4" />
                  <span>
                {store.openingHours || "9:00 - 22:00"}
                    {store.closingHours ? ` — ${store.closingHours}` : ""}
              </span>
                </div>
              </div>
            </div>
        )}

        {/* Сетка продуктов */}
        <div className="px-4 mt-4">
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
              <>
                <div className="grid grid-cols-2 gap-4">
                  {products.map((product) => (
                      <LinkComponent
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

                          {/* Бейджик скидки */}
                          {product.discountPercentage && product.discountPercentage > 0 ? (
                              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg font-inter">
                                -{product.discountPercentage}%
                              </div>
                          ) : null}

                          {/* Индикатор "Нет в наличии" */}
                          {product.stockQuantity <= 0 && (
                              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-sm font-inter">Нет в наличии</span>
                              </div>
                          )}
                        </div>

                        <div className="mt-2">
                          <p className="text-sm font-medium text-black font-inter line-clamp-2">{product.name}</p>
                          {!storeId && product.storeName && (
                              <p className="text-xs text-gray-500 font-inter line-clamp-1">{product.storeName}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {product.discountPercentage && product.discountPercentage > 0 ? (
                                <>
                                  <p className="text-base font-bold text-black font-inter">
                                    {formatPrice(product.price ?? product.discountedPrice ?? product.originalPrice ?? 0)}
                                  </p>
                                  <p className="text-xs text-black/50 line-through font-inter">
                                    {formatPrice(product.originalPrice ?? 0)}
                                  </p>
                                </>
                            ) : (
                                <p className="text-base font-bold text-black font-inter">
                                  {formatPrice(product.price ?? product.originalPrice ?? 0)}
                                </p>
                            )}
                          </div>
                          <p className="text-xs text-black/50 font-inter mt-1">
                            Осталось: {product.stockQuantity}
                          </p>
                        </div>
                      </LinkComponent>
                  ))}
                </div>

                {products.length === 0 && !isLoading && (
                    <div className="text-center py-12">
                      <p className="text-black/50 font-inter">По вашему запросу ничего не найдено</p>
                    </div>
                )}

                {/* Observer Target для бесконечного скролла */}
                <div ref={observerTarget} className="h-10 mt-6 flex items-center justify-center">
                  {isFetchingMore && (
                      <div
                          className="w-6 h-6 border-2 border-[#73be61] border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </>
          )}
        </div>

        {/* Bottom Navigation */}
        <nav
            className="fixed bottom-0 left-0 right-0 bg-gray-100 rounded-t-3xl px-4 py-3 safe-area-inset-bottom shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-around">
            <LinkComponent href="/" className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-gray-50">
                <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            </LinkComponent>

            <LinkComponent href="/markets" className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-gray-50">
                <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </LinkComponent>

            <LinkComponent href="/orders" className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-gray-50">
                <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </LinkComponent>

            <LinkComponent href="/profile" className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-gray-50">
                <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </LinkComponent>
          </div>
        </nav>
      </div>
  );
}

function LoadingFallback() {
  return (
      <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="px-4 pt-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl"></div>
            <div className="h-6 w-32 bg-gray-100 rounded"></div>
          </div>
        </div>
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