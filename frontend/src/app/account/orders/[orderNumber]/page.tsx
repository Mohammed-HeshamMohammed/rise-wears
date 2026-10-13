"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/orders";
import type { Order } from "@/lib/types";

export default function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<Order>(`/me/orders/${encodeURIComponent(orderNumber)}`, { auth: true })
      .then(setOrder)
      .catch((e) => setError(e.message));

  useEffect(() => {
    if (user) load();
  }, [user, orderNumber]);

  async function cancel() {
    if (!confirm("Cancel this order?")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/me/orders/${encodeURIComponent(orderNumber)}/cancel`, { method: "POST", auth: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't cancel.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) return <div className="notice error">{error}</div>;
  if (!order) return <p>Loading…</p>;

  return (
    <>
      <p style={{ marginBottom: 18 }}>
        <Link href="/account/orders" style={{ textDecoration: "underline", fontSize: 14 }}>
          ← All orders
        </Link>
      </p>
      {error && <div className="notice error">{error}</div>}
      <div className="acct-grid">
        <div>
          <div className="order-card">
            <div className="order-head">
              <div>
                <b>{order.orderNumber}</b> <span className="meta">· placed {formatDate(order.createdAt)}</span>
              </div>
              <span className={`status ${order.status}`}>{STATUS_LABEL[order.status]}</span>
            </div>
            <div className="order-lines">
              {order.items.map((it, i) => (
                <div className="order-line" key={i}>
                  <img src={it.imageUrl || "/images/logo.png"} alt={it.name} />
                  <div className="grow">
                    {it.slug ? <Link href={`/products/${it.slug}`}>{it.name}</Link> : it.name}
                    <small>
                      {it.color} · Size {it.size} · Qty {it.quantity}
                    </small>
                  </div>
                  <div>{formatPrice(it.unitPriceCents * it.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="order-foot" style={{ display: "block" }}>
              <div className="totals">
                <div>
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotalCents)}</span>
                </div>
                <div>
                  <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
                  <span>-{formatPrice(order.discountCents)}</span>
                </div>
                <div>
                  <span>Shipping</span>
                  <span>{formatPrice(order.shippingCents)}</span>
                </div>
                <div className="grand">
                  <span>Total (cash on delivery)</span>
                  <span>{formatPrice(order.totalCents)}</span>
                </div>
              </div>
            </div>
          </div>
          {order.status === "pending" && (
            <button className="acct-btn danger" onClick={cancel} disabled={busy}>
              {busy ? "Canceling…" : "Cancel order"}
            </button>
          )}
        </div>

        <div>
          <div className="acct-card">
            <h2>Delivery</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>
              {order.customerName}
              <br />
              {order.address}
              {order.apartment ? `, ${order.apartment}` : ""}
              <br />
              {order.city}, {order.governorate}
              <br />
              {order.mobile}
            </p>
          </div>
          <div className="acct-card">
            <h2>Status</h2>
            <ul className="timeline">
              {order.history?.map((h, i) => (
                <li key={i}>
                  <b>{STATUS_LABEL[h.status]}</b>
                  <small>
                    {formatDate(h.createdAt)}
                    {h.note ? ` · ${h.note}` : ""}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
