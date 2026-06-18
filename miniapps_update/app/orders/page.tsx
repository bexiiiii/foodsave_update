"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import { useTelegram } from "../../hooks/useTelegram";
import { apiClient, Order } from "../../lib/api";

export default function OrdersPage() {
  const { t } = useTranslation();
  const { } = useTelegram(); // Initialize Telegram singleton
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancellingOrderId, setIsCancellingOrderId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadOrders = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const ordersData = await apiClient.getMyOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    // Re-fetch when the tab becomes visible again (e.g. after placing an order)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadOrders(false);
      }
    };

    // Re-fetch when the window regains focus
    const handleFocus = () => loadOrders(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancellableStatuses: Order["status"][] = ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"];

  const canCancelOrder = (status: Order["status"]) => {
    return cancellableStatuses.includes(status);
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
        previousOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? {
                ...currentOrder,
                ...cancelledOrder,
                status: "CANCELLED"
              }
            : currentOrder
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
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500';
      case 'CONFIRMED':
        return 'bg-blue-500';
      case 'PREPARING':
        return 'bg-orange-500';
      case 'READY_FOR_PICKUP':
        return 'bg-green-500';
      case 'OUT_FOR_DELIVERY':
        return 'bg-cyan-500';
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-gray-500';
      case 'CANCELLED':
        return 'bg-red-500';
      case 'REFUNDED':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Ожидает';
      case 'CONFIRMED':
        return 'Подтверждён';
      case 'PREPARING':
        return 'Готовится';
      case 'READY_FOR_PICKUP':
        return 'Готов';
      case 'OUT_FOR_DELIVERY':
        return 'В пути';
      case 'DELIVERED':
      case 'COMPLETED':
        return 'Завершён';
      case 'CANCELLED':
        return 'Отменён';
      case 'REFUNDED':
        return 'Возврат';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
          <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">{t("orders")}</h1>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 mt-6">
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
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-100 rounded-xl p-3">
                <div className="flex items-start gap-3">
                  {/* Store Avatar */}
                  <div className="w-10 h-10 bg-[#73be61] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm font-inter">
                      {order.storeName?.charAt(0).toUpperCase() || 'S'}
                    </span>
                  </div>
                  
                  {/* Order Details */}
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
                            <span key={index} className="text-xs text-black/50 font-inter">
                              {item.productName} x{item.quantity}
                              {index < Math.min(order.orderItems?.length || 0, 2) - 1 && ', '}
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
                        {canCancelOrder(order.status) && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            disabled={isCancellingOrderId === order.id}
                            className="mt-2 inline-flex items-center justify-end gap-1 text-xs font-semibold text-red-600 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
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
                  </div>
                </div>
              </div>
            ))}
            
            {orders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-black/50 font-inter">У вас пока нет заказов</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-100 rounded-t-3xl px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:bg-gray-50">
              <svg className="w-6 h-6 text-black transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </Link>
          
          <Link href="/markets" className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:bg-gray-50">
              <svg className="w-6 h-6 text-black transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </Link>
          
          <Link href="/orders" className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 bg-[#73be61] rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95">
              <svg className="w-6 h-6 text-white transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </Link>
          
          <Link href="/profile" className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:bg-gray-50">
              <svg className="w-6 h-6 text-black transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
