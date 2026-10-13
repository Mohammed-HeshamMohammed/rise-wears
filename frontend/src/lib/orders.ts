import type { OrderStatus } from "./types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  canceled: "Canceled",
  returned: "Returned",
};

export const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];
