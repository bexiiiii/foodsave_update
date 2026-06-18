"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, MapPin, Minus, Plus, Phone, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTelegram } from "../../../hooks/useTelegram";
import { apiClient, Order, Product, Store, isProductVisibleInMiniApp } from "../../../lib/api";

type OrderModalState =
  | { type: "success"; order: Order }
  | { type: "error"; message: string }
  | null;

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { } = useTelegram(); // Initialize Telegram singleton

  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [orderModal, setOrderModal] = useState<OrderModalState>(null);

  // Phone modal state
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Load user profile phone on mount to pre-fill and use in reservations
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) return;
    apiClient.getCurrentUser().then((u) => {
      const phone = u.phone || u.phoneNumber || '';
      if (phone) setPhoneNumber(phone);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    let loadingStarted = false;

    const loadProduct = async () => {
      if (!productId || loadingStarted) return;
      loadingStarted = true;

      try {
        const productData = await apiClient.getProductById(Number(productId));
        if (isMounted) {
          setProduct(productData);
        }
        if (productData?.storeId) {
          try {
            const storeData = await apiClient.getStoreById(productData.storeId);
            if (isMounted) {
              setStore(storeData);
            }
          } catch (storeError) {
            console.error('Failed to load store:', storeError);
          }
        }
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleReserve = async (deliveryType: 'PICKUP' | 'COURIER' = 'PICKUP', contactPhone?: string) => {
    if (!product) return;

    if (!isProductVisibleInMiniApp(product)) {
      console.error('Product unavailable');
      return;
    }

    if (isReserving) return;

    setIsReserving(true);
    try {
      const reservationData = {
        productId: product.id,
        quantity: quantity,
        note: deliveryType === 'COURIER'
          ? `Доставка курьером. Количество: ${quantity}`
          : `Забронировано через Telegram. Количество: ${quantity}`,
        deliveryType,
        contactPhone,
      };

      const order = await apiClient.createReservation(reservationData);

      setProduct((prev) => {
        if (!prev) return prev;
        const remaining = Math.max(prev.stockQuantity - quantity, 0);
        return {
          ...prev,
          stockQuantity: remaining,
          status: remaining > 0 ? prev.status : 'OUT_OF_STOCK',
        };
      });

      setQuantity(1);
      setOrderModal({ type: "success", order });

    } catch (error) {
      console.error('Failed to create reservation:', error);
      const errMsg =
        error instanceof Error
          ? error.message
          : 'Не удалось оформить заказ. Попробуйте ещё раз.';
      setOrderModal({ type: "error", message: errMsg });
    } finally {
      setIsReserving(false);
    }
  };

  const handleCourierClick = () => {
    if (!product || product.stockQuantity <= 0) return;
    setPhoneNumber("");
    setPhoneError("");
    setShowPhoneModal(true);
  };

  const handlePhoneSubmit = () => {
    if (!phoneNumber.trim()) {
      setPhoneError("Это поле обязательно");
      return;
    }
    setShowPhoneModal(false);
    handleReserve('COURIER', phoneNumber.trim());
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString()} ₸`;
  };

  const calculateTotalPrice = () => {
    if (!product) return 0;
    const price = product.price || product.discountedPrice || product.originalPrice;
    return price * quantity;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pb-24" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="px-4 pt-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-48 bg-gray-200 rounded-2xl mb-4"></div>
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white pb-24 flex items-center justify-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <p className="text-black/50 font-inter">Продукт не найден</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-36" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/boxes" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
           <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">Детали продукта</h1>
        </div>
      </div>

      {/* Store Info */}
      <div className="px-4 mt-6">
        <h2 className="text-xl font-semibold text-black font-inter">{product.storeName}</h2>
        <div className="flex items-center gap-3 mt-2 text-sm font-medium text-black/60 font-inter">
          <span>{product.stockQuantity} шт.</span>
          <span>•</span>
          <span>В наличии</span>
        </div>
        {store?.address && (
          <div className="flex items-center gap-2 mt-2 text-sm text-black/60 font-inter">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{store.address}</span>
          </div>
        )}
      </div>

      {/* Product Image */}
      <div className="px-4 mt-6">
        <div className="bg-gray-100 rounded-2xl h-64 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#73be61] flex items-center justify-center">
              <span className="text-white text-4xl font-bold">FS</span>
            </div>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="px-4 mt-6">
        <h3 className="text-2xl font-bold text-black font-inter">{product.name}</h3>
        {product.description && (
          <p className="text-base text-black/60 mt-3 font-inter leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Category */}
        {product.categoryName && (
          <div className="mt-4">
            <span className="bg-gray-100 text-black/60 px-3 py-1 rounded-lg text-sm font-inter">
              {product.categoryName}
            </span>
          </div>
        )}
      </div>

      {/* Price Section */}
      <div className="px-4 mt-6">
        <div className="bg-[#73be61] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              {product.discountPercentage && product.discountPercentage > 0 && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white rounded-xl px-3 py-1">
                    <span className="text-[#73be61] text-sm font-bold font-inter">
                      -{product.discountPercentage}%
                    </span>
                  </div>
                  <p className="text-base font-medium text-white/70 line-through font-inter">
                    {formatPrice(product.originalPrice)}
                  </p>
                </div>
              )}
              <p className="text-3xl font-bold text-white font-inter">
                {formatPrice(product.price || product.discountedPrice || product.originalPrice)}
              </p>
            </div>
          </div>

          {/* Total for quantity */}
          {quantity > 1 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-white/80 text-sm font-inter">
                Итого за {quantity} шт: {formatPrice(calculateTotalPrice())}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stock Warning */}
      {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-orange-100 border border-orange-200 rounded-xl p-3">
            <p className="text-orange-800 text-sm font-inter">
              Осталось всего {product.stockQuantity} шт.
            </p>
          </div>
        </div>
      )}

      {/* Out of Stock */}
      {product.stockQuantity <= 0 && (
        <div className="px-4 mt-4">
          <div className="bg-red-100 border border-red-200 rounded-xl p-3">
            <p className="text-red-800 text-sm font-inter">
              Товара нет в наличии
            </p>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 bg-white border-t border-gray-100 safe-area-inset-bottom">
        {/* Row 1: quantity + reserve */}
        <div className="flex gap-3 pt-4">
          {/* Quantity Selector */}
          <div className="bg-gray-100 rounded-xl flex items-center justify-between px-1 h-12 min-w-32">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 flex items-center justify-center text-black hover:bg-gray-200 rounded-lg transition-colors"
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xl font-semibold text-black mx-2 font-inter min-w-8 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
              className="w-10 h-10 flex items-center justify-center text-black hover:bg-gray-200 rounded-lg transition-colors"
              disabled={quantity >= product.stockQuantity}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Reserve Button */}
          <button
            onClick={() => handleReserve('PICKUP', phoneNumber || undefined)}
            disabled={product.stockQuantity <= 0 || isReserving}
            className="flex-1 bg-[#73be61] rounded-xl h-12 flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#68a556] transition-colors"
          >
            <span className="text-lg font-medium text-white font-inter">
              {isReserving ? 'Бронирование...' : 'Забронировать'}
            </span>
          </button>
        </div>

        {/* Row 2: Courier button */}
        <div className="mt-3">
          <button
            onClick={handleCourierClick}
            disabled={product.stockQuantity <= 0 || isReserving}
            className="w-full bg-white border-2 border-[#73be61] rounded-xl h-12 flex items-center justify-center gap-2 disabled:border-gray-300 disabled:cursor-not-allowed hover:bg-[#73be61]/5 active:scale-95 transition-all"
          >
            <Truck className="w-5 h-5 text-[#73be61]" />
            <span className="text-base font-medium text-[#73be61] font-inter">
              Хочу через курьера
            </span>
          </button>
        </div>
      </div>

      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPhoneModal(false);
          }}
        >
          <div className="w-full bg-white rounded-3xl p-6 shadow-2xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#73be61]/10 rounded-full flex items-center justify-center">
                <Phone className="w-8 h-8 text-[#73be61]" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-black text-center font-inter mb-1">
              Доставка курьером
            </h2>
            <p className="text-sm text-black/50 text-center font-inter mb-5">
              С вами свяжется администратор по поводу этого заказа
            </p>

            {/* Phone Input */}
            <div className="mb-4">
              <input
                type="tel"
                placeholder="+7 777 123 45 67"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError("");
                }}
                className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-[#73be61] outline-none text-base font-inter text-black transition-colors"
                autoFocus
              />
              {phoneError && (
                <p className="text-red-500 text-sm font-inter mt-1 pl-1">{phoneError}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handlePhoneSubmit}
                disabled={isReserving}
                className="w-full bg-[#73be61] rounded-xl h-12 flex items-center justify-center gap-2 hover:bg-[#68a556] active:scale-95 transition-all disabled:bg-gray-300"
              >
                <Truck className="w-5 h-5 text-white" />
                <span className="text-base font-semibold text-white font-inter">
                  {isReserving ? 'Бронирование...' : 'Забронировать с доставкой'}
                </span>
              </button>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="w-full bg-gray-100 rounded-xl h-12 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
              >
                <span className="text-base font-medium text-black font-inter">Отмена</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Result Modal */}
      {orderModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6"
          onClick={(e) => {
            if (e.target === e.currentTarget && orderModal.type === "error") {
              setOrderModal(null);
            }
          }}
        >
          <div className="w-full bg-white rounded-3xl p-6 shadow-2xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {orderModal.type === "success" ? (
              <>
                {/* Success icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-[#73be61]/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-[#73be61]" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-black text-center font-inter mb-2">
                  Заказ оформлен!
                </h2>

                <p className="text-base text-black/60 text-center font-inter mb-1">
                  Номер заказа: <span className="font-semibold text-black">#{orderModal.order.orderNumber || orderModal.order.id}</span>
                </p>

                {/* Bot info block */}
                <div className="mt-4 bg-[#73be61]/10 rounded-2xl p-4">
                  <p className="text-sm text-black/70 font-inter text-center leading-relaxed">
                    Детали заказа и обновления статуса{"\n"}появятся в чате с ботом{" "}
                    <span className="font-semibold text-[#4a9e38]">FoodSave</span>.
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-col gap-3">
                  <button
                    onClick={() => router.push('/orders')}
                    className="w-full bg-[#73be61] rounded-xl h-12 flex items-center justify-center hover:bg-[#68a556] active:scale-95 transition-all"
                  >
                    <span className="text-base font-semibold text-white font-inter">Мои заказы</span>
                  </button>
                  <button
                    onClick={() => {
                      setOrderModal(null);
                      router.push('/');
                    }}
                    className="w-full bg-gray-100 rounded-xl h-12 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                  >
                    <span className="text-base font-medium text-black font-inter">На главную</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Error icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-black text-center font-inter mb-2">
                  Ошибка
                </h2>

                <p className="text-base text-black/60 text-center font-inter">
                  {orderModal.message}
                </p>

                {/* Actions */}
                <div className="mt-5 flex flex-col gap-3">
                  <button
                    onClick={() => setOrderModal(null)}
                    className="w-full bg-[#73be61] rounded-xl h-12 flex items-center justify-center hover:bg-[#68a556] active:scale-95 transition-all"
                  >
                    <span className="text-base font-semibold text-white font-inter">Попробовать снова</span>
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full bg-gray-100 rounded-xl h-12 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                  >
                    <span className="text-base font-medium text-black font-inter">На главную</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
