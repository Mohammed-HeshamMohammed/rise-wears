"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  canceled: "Canceled",
  returned: "Returned",
};

const FILTERS: ("all" | OrderStatus)[] = ["all", "pending", "confirmed", "shipped", "delivered", "canceled", "returned"];

export default function OrdersPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setOrders(null);
    api<Order[]>(`/me/orders${filter === "all" ? "" : `?status=${filter}`}`, { auth: true })
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, [user, filter]);

  return (
    <>
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f} className={`chip${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All orders" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {error && <div className="notice error">{error}</div>}
      {orders === null && !error && <p>Loading orders…</p>}
      {orders?.length === 0 && (
        <div className="empty-state">
          <h2>{filter === "all" ? "NO ORDERS YET" : `NO ${STATUS_LABEL[filter as OrderStatus].toUpperCase()} ORDERS`}</h2>
          <p style={{ marginBottom: 18 }}>When you place an order while logged in, it shows up here.</p>
          <Link href="/shop" className="acct-btn">
            Start shopping
          </Link>
        </div>
      )}

      {orders?.map((o) => (
        <div className="order-card" key={o.id}>
          <div className="order-head">
            <div>
              <b>{o.orderNumber}</b> <span className="meta">· {formatDate(o.createdAt)}</span>
            </div>
            <span className={`status ${o.status}`}>{STATUS_LABEL[o.status]}</span>
          </div>
          <div className="order-lines">
            {o.items.map((it, i) => (
              <div className="order-line" key={i}>
                <img src={it.imageUrl || "/images/logo.png"} alt={it.name} />
                <div className="grow">
                  {it.name}
                  <small>
                    Size {it.size} · Qty {it.quantity}
                  </small>
                </div>
                <div>{formatPrice(it.unitPriceCents * it.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="order-foot">
            <span>
              Total <b>{formatPrice(o.totalCents)}</b>
            </span>
            <Link href={`/account/orders/${o.orderNumber}`} className="acct-btn ghost small">
              View details
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}
