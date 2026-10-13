"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Quote } from "@/lib/types";

export default function CartView() {
  const { items, setQuantity, remove, clear } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    if (items.length === 0) {
      setQuote(null);
      setError("");
      return;
    }
    let live = true;
    api<Quote>("/checkout/quote", { body: { items } })
      .then((q) => live && (setQuote(q), setError("")))
      .catch((e) => live && (setQuote(null), setError(e.message)));
    return () => {
      live = false;
    };
  }, [items, ready]);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const empty = ready && items.length === 0;

  return (
    <section className="cart-page">
      <div className="container">
        <h1>SHOPPING CART</h1>
        <p id="cart-items-count">{`${count} Item${count !== 1 ? "s" : ""}`}</p>

        <div className="cart-layout">
          <div id="cart-items">
            {empty && (
              <div className="empty-cart">
                <h2>Your bag is empty.</h2>
                <p>Looks like you haven't added anything yet.</p>
                <Link href="/shop" className="btn btn-dark">
                  CONTINUE SHOPPING
                </Link>
              </div>
            )}
            {error && (
              <div className="empty-cart">
                <h2>We couldn't load your bag.</h2>
                <p>{error}</p>
                <button className="btn btn-dark" onClick={clear}>
                  CLEAR BAG
                </button>
              </div>
            )}
            {quote?.lines.map((l) => (
              <div className="cart-item" key={`${l.productId}-${l.size}`}>
                <img src={l.imageUrl || "/images/logo.png"} alt={l.name} />
                <div className="cart-item-details">
                  <h3>
                    <Link href={`/products/${l.slug}`}>{l.name}</Link>
                  </h3>
                  <p>{l.color}</p>
                  <p>Size: {l.size}</p>
                  <div className="cart-price">{formatPrice(l.unitCents)}</div>
                  <div className="cart-quantity">
                    <button onClick={() => setQuantity(l.productId, l.size, l.quantity - 1)}>-</button>
                    <span>{l.quantity}</span>
                    <button
                      onClick={() => setQuantity(l.productId, l.size, Math.min(l.quantity + 1, Math.max(l.stock, 1)))}
                      disabled={l.quantity >= l.stock}
                    >
                      +
                    </button>
                  </div>
                  {l.stock < l.quantity && <p className="form-status error">Only {l.stock} left in stock.</p>}
                  <a
                    href="#"
                    className="remove-item"
                    onClick={(e) => {
                      e.preventDefault();
                      remove(l.productId, l.size);
                    }}
                  >
                    Remove
                  </a>
                </div>
              </div>
            ))}
          </div>

          <aside className="cart-summary">
            <h2>ORDER SUMMARY</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span id="subtotal">{formatPrice(quote?.subtotalCents ?? 0)}</span>
            </div>
            <div className="summary-row discount-row">
              <span>Offer discount</span>
              <span id="discount">{quote && quote.discountCents > 0 ? "-" + formatPrice(quote.discountCents) : formatPrice(0)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span id="shipping">{quote ? "At checkout" : formatPrice(0)}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total">
              <span>Total</span>
              <span id="total">{formatPrice(quote ? quote.subtotalCents - quote.discountCents : 0)}</span>
            </div>
            <Link href={items.length && quote ? "/checkout" : "#"} className="btn btn-dark checkout-btn" aria-disabled={!quote}>
              CHECKOUT <span className="button-arrow">↑</span>
            </Link>
            <div className="secure-checkout">
              <p>
                <i className="fa-solid fa-lock"></i> Secure Checkout
              </p>
              <p>
                <i className="fa-solid fa-truck"></i> Fast Shipping All Over Egypt
              </p>
              <p>
                <i className="fa-solid fa-arrow-rotate-left"></i> 14-Day Returns
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
