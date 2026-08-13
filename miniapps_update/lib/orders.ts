import type { Order } from "./api";
import { formatPrice } from "./pricing";

export const activeOrderStatuses = new Set<Order["status"]>([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
]);

export const isActiveOrder = (order: Pick<Order, "status">) =>
  activeOrderStatuses.has(order.status);

export const formatOrderTotal = (order: Pick<Order, "totalAmount" | "total">) =>
  formatPrice(order.totalAmount || order.total || 0);
