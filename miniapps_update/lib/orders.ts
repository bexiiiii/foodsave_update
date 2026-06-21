import type { Order, OrderItem } from "./api";

export const ACTIVE_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
] as const;

export const HISTORY_ORDER_STATUSES = [
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const CANCELLABLE_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
] as const;

export const isActiveOrder = (order: Pick<Order, "status">) => {
  return ACTIVE_ORDER_STATUSES.includes(order.status as typeof ACTIVE_ORDER_STATUSES[number]);
};

export const isHistoryOrder = (order: Pick<Order, "status">) => {
  return HISTORY_ORDER_STATUSES.includes(order.status as typeof HISTORY_ORDER_STATUSES[number]);
};

export const canCancelOrder = (order: Pick<Order, "status">) => {
  return CANCELLABLE_ORDER_STATUSES.includes(order.status as typeof CANCELLABLE_ORDER_STATUSES[number]);
};

export const sortOrdersByCreatedAtDesc = (orders: Order[]) => {
  return [...orders].sort(
    (firstOrder, secondOrder) =>
      new Date(secondOrder.createdAt).getTime() - new Date(firstOrder.createdAt).getTime()
  );
};

export const normalizeOrder = (order: Order): Order => {
  const orderItems = Array.isArray(order.orderItems)
    ? order.orderItems
    : Array.isArray(order.items)
      ? order.items
      : [];

  return {
    ...order,
    orderItems,
    totalAmount: order.totalAmount || order.total || 0,
    storeName: order.storeName || "Unknown Store",
    notes: order.notes || order.deliveryNotes || "",
  };
};

export const getOrderItemPrice = (item: OrderItem) => {
  return item.totalPrice || item.price || item.unitPrice || 0;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-500";
    case "CONFIRMED":
      return "bg-blue-500";
    case "PREPARING":
      return "bg-orange-500";
    case "READY_FOR_PICKUP":
      return "bg-green-500";
    case "OUT_FOR_DELIVERY":
      return "bg-cyan-500";
    case "DELIVERED":
    case "COMPLETED":
      return "bg-gray-500";
    case "CANCELLED":
      return "bg-red-500";
    case "REFUNDED":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case "PENDING":
      return "Ожидает";
    case "CONFIRMED":
      return "Подтверждён";
    case "PREPARING":
      return "Готовится";
    case "READY_FOR_PICKUP":
      return "Готов";
    case "OUT_FOR_DELIVERY":
      return "В пути";
    case "DELIVERED":
    case "COMPLETED":
      return "Завершён";
    case "CANCELLED":
      return "Отменён";
    case "REFUNDED":
      return "Возврат";
    default:
      return status;
  }
};
