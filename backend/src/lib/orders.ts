import type { Db } from "../db.js";

export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "canceled", "returned"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "canceled"],
  confirmed: ["shipped", "canceled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  canceled: [],
  returned: [],
};

export async function restockOrder(db: Db, orderId: number) {
  const items = (await db.query("SELECT product_id, size, quantity FROM order_items WHERE order_id = $1", [orderId])).rows;
  for (const it of items) {
    if (it.product_id == null) continue;
    await db.query("UPDATE product_variants SET stock = stock + $1 WHERE product_id = $2 AND size = $3", [
      it.quantity, it.product_id, it.size,
    ]);
  }
}
