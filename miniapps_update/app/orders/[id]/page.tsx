"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, CreditCard, Loader2, MapPin, Store as StoreIcon, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BottomNav from "../../../components/BottomNav";
import CancelOrderSheet from "../../../components/CancelOrderSheet";
import { useTranslation } from "../../../hooks/useTranslation";
import { apiClient, Order, ReservationCancellationReason } from "../../../lib/api";
import { formatOrderTotal } from "../../../lib/orders";
import { formatPrice } from "../../../lib/pricing";

const getStatusText = (status?: string) => {
  switch (status) {
    case "CREATED":
      return "Создан";
    case "PENDING":
      return "Ожидает";
    case "CONFIRMED":
      return "Подтвержден";
    case "PREPARING":
      return "Готовится";
    case "READY_FOR_PICKUP":
      return "Готов к выдаче";
    case "PICKED_UP":
      return "Забран";
    case "OUT_FOR_DELIVERY":
      return "В пути";
    case "DELIVERED":
    case "COMPLETED":
      return "Завершен";
    case "CANCELLED":
    case "CANCELLED_BY_USER":
    case "CANCELLED_BY_PARTNER":
      return "Отменен";
    case "EXPIRED":
      return "Истек";
    case "NO_SHOW":
      return "Не пришли";
    case "REJECTED":
      return "Отклонен";
    case "REFUNDED":
      return "Возврат";
    default:
      return status || "";
  }
};

export default function OrderDetailsPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelSheetOpen, setIsCancelSheetOpen] = useState(false);

  const cancellableStatuses: Order["status"][] = ["CREATED", "PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"];
  const pickupConfirmableStatuses: Order["status"][] = cancellableStatuses;
  const canCancelOrder = order ? cancellableStatuses.includes(order.status) : false;
  const canConfirmPickup = order ? pickupConfirmableStatuses.includes(order.status) : false;

  useEffect(() => {
    const orderId = Number(params.id);
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    apiClient
      .getOrderById(orderId)
      .then((data) => {
        if (mounted) {
          setOrder({
            ...data,
            orderItems: Array.isArray(data.orderItems) ? data.orderItems : Array.isArray(data.items) ? data.items : [],
          });
        }
      })
      .catch((error) => console.error("Failed to load order:", error))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params.id]);

  const handleCancelOrder = async (reason: ReservationCancellationReason, comment?: string) => {
    if (!order || isCancelling) return;

    setCancelError(null);
    setIsCancelling(true);
    try {
      const cancelledOrder = await apiClient.cancelOrder(order.id, reason, comment);
      setOrder({
        ...order,
        ...cancelledOrder,
        orderItems: Array.isArray(cancelledOrder.orderItems)
          ? cancelledOrder.orderItems
          : Array.isArray(cancelledOrder.items)
            ? cancelledOrder.items
            : order.orderItems,
      });
      setIsCancelSheetOpen(false);
    } catch (error) {
      console.error("Failed to cancel order:", error);
      setCancelError("Не удалось отменить заказ. Попробуйте еще раз.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMarkPickedUp = async () => {
    if (!order || isCompleting) return;

    setCancelError(null);
    setIsCompleting(true);
    try {
      const pickedUpOrder = await apiClient.markOrderPickedUp(order.id);
      setOrder({
        ...order,
        ...pickedUpOrder,
        orderItems: Array.isArray(pickedUpOrder.orderItems)
          ? pickedUpOrder.orderItems
          : Array.isArray(pickedUpOrder.items)
            ? pickedUpOrder.items
            : order.orderItems,
      });
    } catch (error) {
      console.error("Failed to mark order picked up:", error);
      setCancelError(error instanceof Error && error.message ? error.message : "Не удалось отметить заказ забранным. Попробуйте еще раз.");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <header className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/orders" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center active:scale-95 transition-all duration-300">
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">{t("orderDetails")}</h1>
        </div>
      </header>

      <main className="px-4 pt-5">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : !order ? (
          <div className="rounded-2xl bg-gray-100 p-5 text-center text-sm font-semibold text-black/55">
            Заказ не найден
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-3xl bg-[#FFF1F1] p-5 text-black shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#E5484D]/70 font-inter">
                    #{order.orderNumber || order.id}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold font-inter">{formatOrderTotal(order)}</h2>
                </div>
                <span className="rounded-full bg-[#E5484D] px-3 py-1.5 text-xs font-extrabold text-white font-inter">
                  {getStatusText(order.status)}
                </span>
              </div>
            </section>

            {cancelError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 font-inter">
                {cancelError}
              </div>
            )}

            <section className="rounded-2xl bg-gray-100 p-4">
              <div className="flex items-start gap-3">
                <StoreIcon className="mt-0.5 h-5 w-5 text-[#4CAD73]" />
                <div>
                  <p className="text-sm font-bold text-black font-inter">{order.storeName}</p>
                  <p className="mt-1 text-sm text-black/55 font-inter">{order.storeAddress || "Адрес не указан"}</p>
                </div>
              </div>
            </section>

            <section>
              <div className="rounded-2xl bg-gray-100 p-4">
                <CreditCard className="h-5 w-5 text-[#4CAD73]" />
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/45 font-inter">{t("paymentMethod")}</p>
                <p className="mt-1 text-sm font-bold text-black font-inter">{order.paymentMethod || "Не указан"}</p>
              </div>
            </section>

            <section className="rounded-2xl bg-gray-100 p-4">
              <h3 className="text-base font-bold text-black font-inter">{t("orderItems")}</h3>
              <div className="mt-3 space-y-3">
                {(order.orderItems || []).map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-black font-inter">{item.productName}</p>
                      <p className="text-xs text-black/50 font-inter">x{item.quantity}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-black font-inter">
                      {formatPrice(item.totalPrice || item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-gray-100 p-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-[#4CAD73]" />
                <div>
                  <p className="text-sm font-bold text-black font-inter">Получение</p>
                  <p className="mt-1 text-sm text-black/55 font-inter">{order.deliveryAddress || order.storeAddress || "Адрес не указан"}</p>
                </div>
              </div>
            </section>

            {canConfirmPickup && (
              <button
                type="button"
                onClick={handleMarkPickedUp}
                disabled={isCompleting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#4CAD73] text-sm font-bold text-white shadow-sm transition-colors active:scale-[0.99] disabled:bg-[#4CAD73]/50 font-inter"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Сохраняем...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Уже забрала
                  </>
                )}
              </button>
            )}

            {canCancelOrder && (
              <button
                type="button"
                onClick={() => setIsCancelSheetOpen(true)}
                disabled={isCancelling}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#E5484D] text-sm font-bold text-white shadow-sm transition-colors active:scale-[0.99] disabled:bg-red-300 font-inter"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Отменяем...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Отменить заказ
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </main>

      <CancelOrderSheet
        isOpen={isCancelSheetOpen}
        orderLabel={order?.orderNumber || String(order?.id || "")}
        isSubmitting={isCancelling}
        onClose={() => setIsCancelSheetOpen(false)}
        onConfirm={handleCancelOrder}
      />

      <BottomNav active="orders" />
    </div>
  );
}
