"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import BottomNav from "../../components/BottomNav";
import CancelOrderSheet from "../../components/CancelOrderSheet";
import { useTranslation } from "../../hooks/useTranslation";
import { useTelegram } from "../../hooks/useTelegram";
import { apiClient, Order, ReservationCancellationReason } from "../../lib/api";
import { formatOrderTotal } from "../../lib/orders";

const isTodayOrder = (order: Order) => {
  const createdAt = new Date(order.createdAt);
  const today = new Date();

  return (
    createdAt.getFullYear() === today.getFullYear() &&
    createdAt.getMonth() === today.getMonth() &&
    createdAt.getDate() === today.getDate()
  );
};

export default function OrdersPage() {
  const { t } = useTranslation();
  const {} = useTelegram();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancellingOrderId, setIsCancellingOrderId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [orderPendingCancellation, setOrderPendingCancellation] = useState<Order | null>(null);

  const loadOrders = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const ordersData = await apiClient.getMyOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") loadOrders(false);
    };
    const handleFocus = () => loadOrders(false);
    const handleRealtimeOrder = () => loadOrders(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("foodsave:order-status-changed", handleRealtimeOrder);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("foodsave:order-status-changed", handleRealtimeOrder);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeOrders = orders.filter(isTodayOrder);
  const historyOrders = orders.filter((order) => !isTodayOrder(order));
  const visibleOrders = activeTab === "active" ? activeOrders : historyOrders;
  const cancellableStatuses: Order["status"][] = ["CREATED", "PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"];

  const canCancelOrder = (status: Order["status"]) => cancellableStatuses.includes(status);

  const handleCancelOrder = async (reason: ReservationCancellationReason, comment?: string) => {
    const order = orderPendingCancellation;
    if (!order) return;
    setCancelError(null);
    setIsCancellingOrderId(order.id);

    try {
      const cancelledOrder = await apiClient.cancelOrder(order.id, reason, comment);
      setOrders((previousOrders) =>
        previousOrders.map((currentOrder) =>
          currentOrder.id === order.id ? { ...currentOrder, ...cancelledOrder, status: "CANCELLED_BY_USER" } : currentOrder,
        ),
      );
      setOrderPendingCancellation(null);
    } catch (error) {
      console.error("Failed to cancel order:", error);
      setCancelError(error instanceof Error && error.message ? error.message : "Не удалось отменить заказ. Попробуйте еще раз.");
    } finally {
      setIsCancellingOrderId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
      case "CREATED":
        return "bg-yellow-500";
      case "CONFIRMED":
        return "bg-blue-500";
      case "PREPARING":
        return "bg-orange-500";
      case "READY_FOR_PICKUP":
        return "bg-green-500";
      case "OUT_FOR_DELIVERY":
        return "bg-cyan-500";
      case "CANCELLED":
      case "CANCELLED_BY_USER":
      case "CANCELLED_BY_PARTNER":
        return "bg-red-500";
      case "REFUNDED":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
      case "CREATED":
        return "Ожидает";
      case "CONFIRMED":
        return "Подтвержден";
      case "PREPARING":
        return "Готовится";
      case "READY_FOR_PICKUP":
        return "Готов";
      case "OUT_FOR_DELIVERY":
        return "В пути";
      case "DELIVERED":
      case "COMPLETED":
        return "Завершен";
      case "CANCELLED":
      case "CANCELLED_BY_USER":
      case "CANCELLED_BY_PARTNER":
        return "Отменен";
      case "REFUNDED":
        return "Возврат";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <header className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center active:scale-95 transition-all duration-300">
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">{t("orders")}</h1>
        </div>
      </header>

      <main className="px-4 mt-6">
        <div className="mb-4 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`h-11 rounded-xl text-sm font-bold transition-colors font-inter ${
              activeTab === "active" ? "bg-white text-[#15551F] shadow-sm" : "text-black/50"
            }`}
          >
            {t("activeOrders")} {activeOrders.length > 0 ? `(${activeOrders.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`h-11 rounded-xl text-sm font-bold transition-colors font-inter ${
              activeTab === "history" ? "bg-white text-[#15551F] shadow-sm" : "text-black/50"
            }`}
          >
            {t("orderHistory")}
          </button>
        </div>

        {cancelError && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 font-inter">
            {cancelError}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-gray-100 rounded-xl p-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded mb-2" />
                    <div className="h-3 bg-gray-300 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((order) => (
              <div key={order.id} className="rounded-xl bg-gray-100 p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#4CAD73] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm font-inter">
                      {order.storeName?.charAt(0).toUpperCase() || "S"}
                    </span>
                  </div>

                  <Link href={`/orders/${order.id}`} className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-black font-inter truncate">{order.storeName}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`} />
                        <span className="text-xs font-medium text-black/70 font-inter">{getStatusText(order.status)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-black/50 font-inter mb-2">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-black/60 font-inter">{order.orderItems?.length || 0} позиций</p>
                        <p className="mt-1 truncate text-xs text-black/50 font-inter">
                          {(order.orderItems || []).map((item) => `${item.productName} x${item.quantity}`).join(", ")}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-black font-inter">{formatOrderTotal(order)}</p>
                    </div>
                  </Link>

                  {canCancelOrder(order.status) && (
                    <button
                      type="button"
                      onClick={() => setOrderPendingCancellation(order)}
                      disabled={isCancellingOrderId === order.id}
                      className="mt-7 inline-flex shrink-0 items-center justify-end gap-1 text-xs font-semibold text-red-600 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                    >
                      {isCancellingOrderId === order.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Отмена...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Отменить
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {visibleOrders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-black/50 font-inter">
                  {activeTab === "active" ? "Активных заказов нет" : "История заказов пустая"}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <CancelOrderSheet
        isOpen={Boolean(orderPendingCancellation)}
        orderLabel={orderPendingCancellation?.orderNumber || String(orderPendingCancellation?.id || "")}
        isSubmitting={isCancellingOrderId !== null}
        onClose={() => setOrderPendingCancellation(null)}
        onConfirm={handleCancelOrder}
      />

      <BottomNav active="orders" />
    </div>
  );
}
