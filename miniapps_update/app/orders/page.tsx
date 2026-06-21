"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { useTelegram } from "../../hooks/useTelegram";
import { apiClient, Order } from "../../lib/api";
import {
  canCancelOrder,
  getStatusColor,
  getStatusText,
  isActiveOrder,
  isHistoryOrder,
  sortOrdersByCreatedAtDesc,
} from "../../lib/orders";
import BottomNavigation from "../../components/BottomNavigation";

type OrdersTab = "active" | "history";

export default function OrdersPage() {
  const { t } = useTranslation();
  const { } = useTelegram();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTab, setSelectedTab] = useState<OrdersTab>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [isCancellingOrderId, setIsCancellingOrderId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadOrders = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const ordersData = await apiClient.getMyOrders();
      setOrders(sortOrdersByCreatedAtDesc(ordersData));
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    setSelectedTab(tab === "history" ? "history" : "active");
    loadOrders();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadOrders(false);
      }
    };

    const handleFocus = () => loadOrders(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const activeOrders = useMemo(() => orders.filter(isActiveOrder), [orders]);
  const historyOrders = useMemo(() => orders.filter(isHistoryOrder), [orders]);
  const visibleOrders = selectedTab === "active" ? activeOrders : historyOrders;

  const handleTabChange = (tab: OrdersTab) => {
    setSelectedTab(tab);
    router.replace(tab === "history" ? "/orders?tab=history" : "/orders");
  };

  const handleCancelOrder = async (order: Order) => {
    if (typeof window !== "undefined") {
      const isConfirmed = window.confirm(`Отменить заказ #${order.orderNumber || order.id}?`);
      if (!isConfirmed) {
        return;
      }
    }

    setCancelError(null);
    setIsCancellingOrderId(order.id);

    try {
      const cancelledOrder = await apiClient.cancelOrder(order.id);
      setOrders((previousOrders) =>
        sortOrdersByCreatedAtDesc(
          previousOrders.map((currentOrder) =>
            currentOrder.id === order.id
              ? {
                  ...currentOrder,
                  ...cancelledOrder,
                  status: "CANCELLED",
                }
              : currentOrder
          )
        )
      );
    } catch (error) {
      console.error("Failed to cancel order:", error);
      setCancelError("Не удалось отменить заказ. Попробуйте ещё раз.");
    } finally {
      setIsCancellingOrderId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">{t("orders")}</h1>
        </div>
      </div>

      <div className="px-4 mt-5">
        <div className="grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => handleTabChange("active")}
            className={`h-10 rounded-xl text-sm font-semibold transition-colors ${
              selectedTab === "active" ? "bg-white text-black shadow-sm" : "text-black/50"
            }`}
          >
            Активные {activeOrders.length > 0 ? `(${activeOrders.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("history")}
            className={`h-10 rounded-xl text-sm font-semibold transition-colors ${
              selectedTab === "history" ? "bg-white text-black shadow-sm" : "text-black/50"
            }`}
          >
            История {historyOrders.length > 0 ? `(${historyOrders.length})` : ""}
          </button>
        </div>
      </div>

      <div className="px-4 mt-5">
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
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((order) => (
              <div key={order.id} className="bg-gray-100 rounded-xl p-3">
                <button
                  type="button"
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#73be61] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm font-inter">
                        {order.storeName?.charAt(0).toUpperCase() || "S"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-sm font-semibold text-black font-inter truncate">
                          {order.storeName}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}></div>
                          <span className="text-xs font-medium text-black/70 font-inter">
                            {getStatusText(order.status)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-black/50 font-inter mb-2">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-black/60 font-inter">
                            {order.orderItems?.length || 0} позиций
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(order.orderItems || []).slice(0, 2).map((item, index) => (
                              <span key={`${item.productId}-${index}`} className="text-xs text-black/50 font-inter">
                                {item.productName} x{item.quantity}
                                {index < Math.min(order.orderItems?.length || 0, 2) - 1 && ", "}
                              </span>
                            ))}
                            {(order.orderItems?.length || 0) > 2 && (
                              <span className="text-xs text-black/50 font-inter">
                                +{(order.orderItems?.length || 0) - 2} ещё
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-sm font-bold text-black font-inter">
                            {(order.totalAmount || order.total || 0).toLocaleString()} ₸
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {canCancelOrder(order) && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order)}
                      disabled={isCancellingOrderId === order.id}
                      className="inline-flex items-center justify-end gap-1 text-xs font-semibold text-red-600 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
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
                  </div>
                )}
              </div>
            ))}

            {visibleOrders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-black/50 font-inter">
                  {selectedTab === "active" ? "Активных заказов нет" : "История заказов пуста"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
