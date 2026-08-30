"use client";

import { useEffect, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, HelpCircle, MapPin, Minus, Plus, Phone, Star, Timer, Truck, X, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTelegram } from "../../../hooks/useTelegram";
import { useTranslation } from "../../../hooks/useTranslation";
import { apiClient, canReserveProduct, isProductDisplayableInMiniApp, Order, Product, Store } from "../../../lib/api";
import ProductAvailabilityBadge from "../../../components/ProductAvailabilityBadge";
import { formatPrice, normalizePrice } from "../../../lib/pricing";
import BackButton from "../../../components/BackButton";
import { formatMinutesUntilClose } from "../../../components/ClosingSoonBadge";
import FavoriteToast from "../../../components/FavoriteToast";
import { readAttribution } from "../../../components/StartParamRouter";
import {
  dismissDecisionHelpPrompt,
  canShowDecisionHelpPrompt,
  getPersonalizationSessionId,
  markDecisionHelpPromptShown,
  recordProductReservation,
  recordProductView,
  shouldCheckDecisionHelpServer,
  shouldShowDecisionHelpPrompt,
} from "../../../lib/personalization";

type OrderModalState =
  | { type: "success"; order: Order }
  | { type: "error"; message: string }
  | null;

const galleryLabels = ["Обложка", "Внутри", "Снаружи", "Детали"];

function resolveProductImages(product: Product | null): string[] {
  if (!product) return [];

  const images = [...(product.images || []), product.imageUrl]
    .filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    .map((image) => image.trim());

  return Array.from(new Set(images));
}

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { } = useTelegram(); // Initialize Telegram singleton
  const { t, language } = useTranslation();

  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isReserving, setIsReserving] = useState(false);
  const [orderModal, setOrderModal] = useState<OrderModalState>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [toast, setToast] = useState<{ title: string; itemName: string } | null>(null);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [showDecisionHelpPrompt, setShowDecisionHelpPrompt] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Phone modal state
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Closing-soon confirmation gate — shown before either reserve flow proceeds,
  // so someone who scrolled past the inline warning still has to acknowledge it.
  const [showClosingSoonConfirm, setShowClosingSoonConfirm] = useState(false);
  const [pendingReserveType, setPendingReserveType] = useState<'PICKUP' | 'COURIER' | null>(null);

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
    let decisionHelpTimer: number | undefined;

    const loadProduct = async () => {
      if (!productId || loadingStarted) return;
      loadingStarted = true;
      setIsLoading(true);
      setLoadError(false);

      try {
        const productData = await apiClient.getProductById(Number(productId));
        if (isMounted) {
          setProduct(productData);
          setIsFavorite(!!productData.isFavorite);
          try {
            const recordedView = recordProductView(productData);
            const localEligible = shouldShowDecisionHelpPrompt();
            if (recordedView) {
              const attribution = readAttribution();
              const sessionId = getPersonalizationSessionId();
              void apiClient.trackEvent({
                eventType: "BOX_VIEWED",
                sessionId: String(attribution.sessionId || sessionId),
                source: String(attribution.source || "direct"),
                notificationGroupId: typeof attribution.notificationGroupId === "number" ? attribution.notificationGroupId : undefined,
                campaignId: typeof attribution.campaignId === "string" ? attribution.campaignId : undefined,
                telegramPostId: typeof attribution.telegramPostId === "string" ? attribution.telegramPostId : undefined,
                startParam: typeof attribution.startParam === "string" ? attribution.startParam : undefined,
                partnerId: productData.storeId,
                branchId: productData.storeId,
                boxId: productData.id,
                idempotencyKey: `box-view-${sessionId}-${productData.id}-${Math.floor(Date.now() / 45000)}`,
                metadata: {
                  availableQuantity: productData.stockQuantity,
                  boxPrice: productData.price || productData.discountedPrice || productData.originalPrice,
                  originalPrice: productData.originalPrice,
                  discountPercent: productData.discountPercentage,
                },
              });

              decisionHelpTimer = window.setTimeout(async () => {
                let serverEligible = false;
                if (!localEligible && shouldCheckDecisionHelpServer()) {
                  try {
                    const serverDecision = await apiClient.shouldShowDecisionHelp(sessionId);
                    serverEligible = serverDecision.showPrompt;
                  } catch (decisionHelpError) {
                    console.warn("Optional decision help check skipped:", decisionHelpError);
                  }
                }
                if (!isMounted || !canShowDecisionHelpPrompt() || (!localEligible && !serverEligible)) return;

                markDecisionHelpPromptShown();
                setShowDecisionHelpPrompt(true);
                void apiClient.trackEvent({
                  eventType: "DECISION_HELP_SHOWN",
                  sessionId,
                  source: String(attribution.source || "direct"),
                  partnerId: productData.storeId,
                  branchId: productData.storeId,
                  boxId: productData.id,
                  language: localStorage.getItem("language") || undefined,
                  idempotencyKey: `decision-help-shown-${sessionId}`,
                });
              }, localEligible ? 150 : 800);
            }
          } catch (personalizationError) {
            console.warn("Optional personalization skipped:", personalizationError);
          }
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
        if (isMounted) setLoadError(true);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
      if (decisionHelpTimer) window.clearTimeout(decisionHelpTimer);
    };
  }, [productId, loadAttempt]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  const handleReserve = async (deliveryType: 'PICKUP' | 'COURIER' = 'PICKUP', contactPhone?: string) => {
    if (!product) return;

    if (!canReserveProduct(product)) {
      console.error('Product unavailable');
      return;
    }

    if (isReserving) return;

    setIsReserving(true);
    try {
      const attribution = readAttribution();
      apiClient.trackEvent({
        eventType: "RESERVATION_BUTTON_CLICKED",
        sessionId: String(attribution.sessionId || sessionStorage.getItem("foodsaveSessionId") || ""),
        source: String(attribution.source || "direct"),
        notificationGroupId: typeof attribution.notificationGroupId === "number" ? attribution.notificationGroupId : undefined,
        campaignId: typeof attribution.campaignId === "string" ? attribution.campaignId : undefined,
        telegramPostId: typeof attribution.telegramPostId === "string" ? attribution.telegramPostId : undefined,
        startParam: typeof attribution.startParam === "string" ? attribution.startParam : undefined,
        partnerId: product.storeId,
        branchId: product.storeId,
        boxId: product.id,
      });
      const reservationData = {
        productId: product.id,
        quantity: quantity,
        note: deliveryType === 'COURIER'
          ? `Доставка курьером. Количество: ${quantity}`
          : `Забронировано через Telegram. Количество: ${quantity}`,
        deliveryType,
        contactPhone,
        acquisitionSource: String(attribution.source || "direct"),
        campaignId: typeof attribution.campaignId === "string" ? attribution.campaignId : undefined,
        notificationId: typeof attribution.notificationId === "number" ? attribution.notificationId : undefined,
        notificationGroupId: typeof attribution.notificationGroupId === "number" ? attribution.notificationGroupId : undefined,
        telegramPostId: typeof attribution.telegramPostId === "string" ? attribution.telegramPostId : undefined,
        startParam: typeof attribution.startParam === "string" ? attribution.startParam : undefined,
        sessionId: String(attribution.sessionId || sessionStorage.getItem("foodsaveSessionId") || ""),
      };

      const order = await apiClient.createReservation(reservationData);
      recordProductReservation(product);
      setShowDecisionHelpPrompt(false);

      setProduct((prev) => {
        if (!prev) return prev;
        const remaining = Math.max(prev.stockQuantity - quantity, 0);
        return {
          ...prev,
          stockQuantity: remaining,
          status: remaining > 0 ? prev.status : 'OUT_OF_STOCK',
          canReserve: remaining > 0,
          availabilityState: remaining > 0 ? 'AVAILABLE' : 'RESERVED',
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
      try {
        const refreshed = await apiClient.getProductById(product.id);
        setProduct(refreshed);
      } catch {}
    } finally {
      setIsReserving(false);
    }
  };

  const proceedWithPickup = () => {
    handleReserve('PICKUP', phoneNumber || undefined);
  };

  const proceedWithCourier = () => {
    if (!product || product.stockQuantity <= 0) return;
    setPhoneNumber("");
    setPhoneError("");
    setShowPhoneModal(true);
  };

  const handlePickupClick = () => {
    if (product?.closingSoon) {
      setPendingReserveType('PICKUP');
      setShowClosingSoonConfirm(true);
      return;
    }
    proceedWithPickup();
  };

  const handleCourierClick = () => {
    if (!product || product.stockQuantity <= 0) return;
    if (product.closingSoon) {
      setPendingReserveType('COURIER');
      setShowClosingSoonConfirm(true);
      return;
    }
    proceedWithCourier();
  };

  const handleClosingSoonConfirm = () => {
    setShowClosingSoonConfirm(false);
    const type = pendingReserveType;
    setPendingReserveType(null);
    if (type === 'PICKUP') proceedWithPickup();
    else if (type === 'COURIER') proceedWithCourier();
  };

  const handlePhoneSubmit = () => {
    if (!phoneNumber.trim()) {
      setPhoneError("Это поле обязательно");
      return;
    }
    setShowPhoneModal(false);
    handleReserve('COURIER', phoneNumber.trim());
  };

  const calculateTotalPrice = () => {
    if (!product) return 0;
    const price = product.price || product.discountedPrice || product.originalPrice;
    return normalizePrice(price) * quantity;
  };

  const toggleFavorite = async () => {
    if (!product || isTogglingFavorite) return;

    const previousValue = isFavorite;
    setIsFavorite(!previousValue);
    setIsTogglingFavorite(true);
    setToast({
      title: previousValue ? "Убрано из избранного" : "Добавлено в избранное",
      itemName: product.name,
    });
    try {
      await apiClient.toggleFavoriteProduct(product.id, previousValue);
    } catch (error) {
      console.error("Failed to toggle favorite product:", error);
      setIsFavorite(previousValue);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const openDecisionHelp = () => {
    dismissDecisionHelpPrompt();
    setShowDecisionHelpPrompt(false);
    const supportUrl = "https://t.me/FoodSave_kz";
    void apiClient.trackEvent({
      eventType: "DECISION_HELP_OPENED",
      sessionId: getPersonalizationSessionId(),
      partnerId: product?.storeId,
      branchId: product?.storeId,
      boxId: product?.id,
      language,
      idempotencyKey: `decision-help-opened-${getPersonalizationSessionId()}`,
    });
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(supportUrl);
      return;
    }
    window.open(supportUrl, "_blank", "noopener,noreferrer");
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

  if (loadError && !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <XCircle className="h-12 w-12 text-[#E5484D]" />
        <h1 className="mt-4 text-xl font-bold text-black">Не удалось загрузить бокс</h1>
        <p className="mt-2 text-sm text-black/50">Проверьте соединение и попробуйте ещё раз.</p>
        <button
          type="button"
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          className="mt-6 h-12 w-full max-w-xs rounded-xl bg-[#4CAD73] font-bold text-white"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!product || !isProductDisplayableInMiniApp(product)) {
    return (
      <div className="min-h-screen bg-white pb-24 flex items-center justify-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <p className="px-6 text-center text-black/50 font-inter">{t("boxNoLongerAvailable")}</p>
      </div>
    );
  }

  const productImages = resolveProductImages(product);
  const canReserve = canReserveProduct(product);
  const availabilityLabel = t("boxReserved");
  const activeImage = productImages[activeImageIndex] || null;
  const hasMultipleImages = productImages.length > 1;
  const showPreviousImage = () => {
    setActiveImageIndex((current) => (current === 0 ? productImages.length - 1 : current - 1));
  };
  const showNextImage = () => {
    setActiveImageIndex((current) => (current + 1) % productImages.length);
  };

  return (
    <div className="min-h-screen bg-white pb-36" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <BackButton fallback={product.storeId ? `/boxes?storeId=${product.storeId}` : "/markets"} />
          <h1 className="text-xl font-bold text-black font-inter flex-1">Детали продукта</h1>
          <button
            aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
            disabled={isTogglingFavorite}
            onClick={toggleFavorite}
            type="button"
            className={`flex h-10 w-10 shrink-0 items-center justify-center transition-colors active:scale-90 ${
              isFavorite ? "text-amber-500" : "text-black/45"
            }`}
          >
            <Star className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {showDecisionHelpPrompt && (
        <div className="px-4 mt-4">
          <div className="rounded-2xl border border-[#4CAD73]/20 bg-[#F1FAF4] p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#4CAD73]">
                <HelpCircle className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={openDecisionHelp}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-bold text-black font-inter">{t("decisionHelpTitle")}</p>
                <p className="mt-0.5 text-xs font-medium leading-relaxed text-black/55 font-inter">
                  {t("decisionHelpDescription")}
                </p>
              </button>
              <button
                type="button"
                aria-label={t("decisionHelpDismiss")}
                onClick={() => {
                  dismissDecisionHelpPrompt();
                  setShowDecisionHelpPrompt(false);
                  void apiClient.trackEvent({
                    eventType: "DECISION_HELP_DISMISSED",
                    sessionId: getPersonalizationSessionId(),
                    partnerId: product.storeId,
                    branchId: product.storeId,
                    boxId: product.id,
                    language,
                    idempotencyKey: `decision-help-dismissed-${getPersonalizationSessionId()}`,
                  });
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-black/35"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Info */}
      <div className="px-4 mt-6">
        <h2 className="text-xl font-semibold text-black font-inter">{product.storeName}</h2>
        <div className="flex items-center gap-3 mt-2 text-sm font-medium text-black/60 font-inter">
          <span>{Math.max(product.stockQuantity, 0)} шт.</span>
          <span>•</span>
          <span>{canReserve ? t("boxAvailable") : availabilityLabel}</span>
        </div>
        {store?.address && (
          <div className="flex items-center gap-2 mt-2 text-sm text-black/60 font-inter">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{store.address}</span>
          </div>
        )}
      </div>

      {/* Product Gallery */}
      <div className="px-4 mt-6">
        <div className="relative h-72 overflow-hidden rounded-[28px] bg-gray-100">
          {activeImage ? (
            <img
              src={activeImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#4CAD73] flex items-center justify-center">
              <span className="text-white text-4xl font-bold">FS</span>
            </div>
          )}
          {product.discountPercentage && product.discountPercentage > 0 && (
            <div className="absolute left-4 top-4 rounded-full bg-[#EC405A] px-3 py-1.5 text-sm font-bold text-white shadow-lg">
              -{product.discountPercentage}%
            </div>
          )}
          <ProductAvailabilityBadge product={product} />
          {hasMultipleImages && (
            <>
              <button
                type="button"
                aria-label="Предыдущее фото"
                onClick={showPreviousImage}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur active:scale-95"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Следующее фото"
                onClick={showNextImage}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur active:scale-95"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {activeImageIndex + 1}/{productImages.length}
              </div>
            </>
          )}
        </div>
        {hasMultipleImages && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {productImages.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-gray-100 transition ${
                  activeImageIndex === index ? "border-[#4CAD73]" : "border-transparent"
                }`}
                aria-label={`Открыть фото ${index + 1}`}
              >
                <img src={image} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {galleryLabels[index] || `Фото ${index + 1}`}
                </span>
              </button>
            ))}
          </div>
        )}
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
            <span className="inline-flex rounded-full border border-[#4CAD73]/20 bg-[#EDF7F0] px-3 py-1 text-sm text-[#4CAD73] font-inter">
              {product.categoryName}
            </span>
          </div>
        )}
      </div>

      {/* Price Section */}
      <div className="px-4 mt-6">
        <div className="bg-[#4CAD73] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              {product.discountPercentage && product.discountPercentage > 0 && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white rounded-xl px-3 py-1">
                    <span className="text-[#4CAD73] text-sm font-bold font-inter">
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
      {!canReserve && (
        <div className="px-4 mt-4">
          <div className="bg-red-100 border border-red-200 rounded-xl p-3">
            <p className="text-red-800 text-sm font-inter">
              {t("boxReservedMessage")}
            </p>
          </div>
        </div>
      )}

      {/* Closing Soon Warning — the last thing shown before the reserve button */}
      {product.closingSoon && (
        <div className="px-4 mt-4">
          <div className="flex items-start gap-3 bg-[#FF9500]/10 border border-[#FF9500]/25 rounded-xl p-3">
            <Timer className="w-5 h-5 text-[#FF9500] shrink-0 mt-0.5" />
            <p className="text-[#B15F00] text-sm font-inter leading-relaxed">
              <span className="font-semibold">
                Заведение закроется через{" "}
                {product.closingSoonMinutes != null ? formatMinutesUntilClose(product.closingSoonMinutes) : "час"}
              </span>
              {store?.closingHours ? ` (в ${store.closingHours})` : ""} — заберите заказ вовремя, иначе бронь могут отменить.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 bg-white border-t border-gray-100 safe-area-inset-bottom">
        {/* Row 1: quantity + reserve */}
        {canReserve ? <div className="flex gap-3 pt-4">
          {/* Quantity Selector */}
          <div className="fs-surface rounded-xl flex items-center justify-between px-1 h-12 min-w-32">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 flex items-center justify-center text-black rounded-lg transition active:bg-[#EDF7F0]"
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xl font-semibold text-black mx-2 font-inter min-w-8 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
              className="w-10 h-10 flex items-center justify-center text-black rounded-lg transition active:bg-[#EDF7F0]"
              disabled={quantity >= product.stockQuantity}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Reserve Button */}
          <button
            onClick={handlePickupClick}
            disabled={!canReserve || isReserving}
            className="flex-1 bg-[#4CAD73] rounded-xl h-12 flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#4CAD73] transition-colors"
          >
            <span className="text-lg font-medium text-white font-inter">
              {isReserving ? 'Бронирование...' : 'Забронировать'}
            </span>
          </button>
        </div> : (
          <div className="pt-4">
            <button disabled className="h-12 w-full rounded-xl bg-gray-200 font-bold text-black/45">
              {availabilityLabel}
            </button>
          </div>
        )}

        {/* Row 2: Courier button */}
        {canReserve && <div className="mt-3">
          <button
            onClick={handleCourierClick}
            disabled={!canReserve || isReserving}
            className="w-full bg-white border-2 border-[#4CAD73] rounded-xl h-12 flex items-center justify-center gap-2 disabled:border-gray-300 disabled:cursor-not-allowed hover:bg-[#4CAD73]/5 active:scale-95 transition-all"
          >
            <Truck className="w-5 h-5 text-[#4CAD73]" />
            <span className="text-base font-medium text-[#4CAD73] font-inter">
              Хочу через курьера
            </span>
          </button>
        </div>}
      </div>

      {/* Closing Soon Confirmation — required acknowledgement before the reserve goes through */}
      {showClosingSoonConfirm && product && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 px-4 pb-6">
          <div className="w-full bg-white rounded-3xl p-6 shadow-2xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-[#FF9500] rounded-2xl flex items-center justify-center">
                <Timer className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-black text-center font-inter mb-1.5">
              Заведение скоро закроется
            </h2>
            <p className="text-[15px] leading-relaxed text-black/60 text-center font-inter mb-5">
              {store?.name ? <span className="font-medium text-black">{store.name}</span> : "Заведение"} закроется через{" "}
              {product.closingSoonMinutes != null ? formatMinutesUntilClose(product.closingSoonMinutes) : "час"}
              {store?.closingHours ? ` (в ${store.closingHours})` : ""}. Убедитесь, что успеете забрать заказ вовремя.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleClosingSoonConfirm}
                className="w-full bg-[#4CAD73] rounded-2xl h-[50px] flex items-center justify-center hover:opacity-90 active:scale-[0.97] transition-transform"
              >
                <span className="text-[17px] font-semibold text-white font-inter">Понятно, продолжить</span>
              </button>
              <button
                onClick={() => {
                  setShowClosingSoonConfirm(false);
                  setPendingReserveType(null);
                }}
                className="fs-surface w-full rounded-2xl h-[50px] flex items-center justify-center active:scale-[0.97] transition-transform"
              >
                <span className="text-[17px] font-medium text-black font-inter">Отмена</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="w-16 h-16 bg-[#4CAD73]/10 rounded-full flex items-center justify-center">
                <Phone className="w-8 h-8 text-[#4CAD73]" />
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
                className="fs-field w-full h-12 px-4 rounded-xl outline-none text-base font-inter text-black transition"
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
                className="w-full bg-[#4CAD73] rounded-xl h-12 flex items-center justify-center gap-2 hover:bg-[#4CAD73] active:scale-95 transition-all disabled:bg-gray-300"
              >
                <Truck className="w-5 h-5 text-white" />
                <span className="text-base font-semibold text-white font-inter">
                  {isReserving ? 'Бронирование...' : 'Забронировать с доставкой'}
                </span>
              </button>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="fs-surface w-full rounded-xl h-12 flex items-center justify-center active:scale-95 transition-all"
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
                  <div className="w-20 h-20 bg-[#4CAD73]/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-[#4CAD73]" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-black text-center font-inter mb-2">
                  Заказ оформлен!
                </h2>

                <p className="text-base text-black/60 text-center font-inter mb-1">
                  Номер заказа: <span className="font-semibold text-black">#{orderModal.order.orderNumber || orderModal.order.id}</span>
                </p>

                {/* Bot info block */}
                <div className="mt-4 bg-[#4CAD73]/10 rounded-2xl p-4">
                  <p className="text-sm text-black/70 font-inter text-center leading-relaxed">
                    Детали заказа и обновления статуса{"\n"}появятся в чате с ботом{" "}
                    <span className="font-semibold text-[#4CAD73]">FoodSave</span>.
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-col gap-3">
                  <button
                    onClick={() => router.push('/orders')}
                    className="w-full bg-[#4CAD73] rounded-xl h-12 flex items-center justify-center hover:bg-[#4CAD73] active:scale-95 transition-all"
                  >
                    <span className="text-base font-semibold text-white font-inter">Мои заказы</span>
                  </button>
                  <button
                    onClick={() => {
                      setOrderModal(null);
                      router.push('/');
                    }}
                    className="fs-surface w-full rounded-xl h-12 flex items-center justify-center active:scale-95 transition-all"
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
                    className="w-full bg-[#4CAD73] rounded-xl h-12 flex items-center justify-center hover:bg-[#4CAD73] active:scale-95 transition-all"
                  >
                    <span className="text-base font-semibold text-white font-inter">Попробовать снова</span>
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="fs-surface w-full rounded-xl h-12 flex items-center justify-center active:scale-95 transition-all"
                  >
                    <span className="text-base font-medium text-black font-inter">На главную</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <FavoriteToast title={toast?.title ?? null} itemName={toast?.itemName} onClose={() => setToast(null)} />
    </div>
  );
}
