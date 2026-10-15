"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { GOVERNORATES } from "@/lib/governorates";
import type { Quote } from "@/lib/types";

export default function CheckoutView() {
  const router = useRouter();
  const { items, clear } = useCart();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", mobile: "", governorate: "", city: "", address: "", apartment: "", notes: "" });
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [me, addrs] = await Promise.all([api("/me", { auth: true }), api<any[]>("/me/addresses", { auth: true })]);
        const a = addrs[0];
        setForm((f) => ({
          ...f,
          name: f.name || me.name || "",
          email: f.email || me.email || "",
          mobile: f.mobile || a?.mobile || me.mobile || "",
          governorate: f.governorate || a?.governorate || "",
          city: f.city || a?.city || "",
          address: f.address || a?.address || "",
          apartment: f.apartment || a?.apartment || "",
        }));
      } catch {}
    })();
  }, [user]);

  useEffect(() => {
    if (!ready || items.length === 0) return setQuote(null);
    let live = true;
    api<Quote>("/checkout/quote", { body: { items, governorate: form.governorate || undefined, promoCode: promo || undefined } })
      .then((q) => {
        if (!live) return;
        setQuote(q);
        setError("");
        if (promo) setPromoMsg(q.promoMessage ?? (q.appliedPromo ? `Promo code ${q.appliedPromo} applied.` : "Promo code can't be combined with the buy 2 get 50% off offer."));
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [items, form.governorate, promo, ready]);

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (!quote || busy) return;
    setBusy(true);
    setError("");
    try {
      const { name, email, mobile, city, address, apartment, notes } = form;
      const res = await api<{ orderNumber: string; totalCents: number }>("/orders", {
        auth: !!user,
        body: { items, governorate: form.governorate, promoCode: promo || undefined, customer: { name, email, mobile, city, address, apartment, notes } },
      });
      clear();
      router.push(`/checkout/success?order=${encodeURIComponent(res.orderNumber)}&total=${res.totalCents}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't place your order.");
      setBusy(false);
    }
  }

  const empty = ready && items.length === 0;

  return (
    <section className="checkout-page">
      <div className="container">
        <h1>CHECKOUT</h1>
        {empty ? (
          <div className="empty-cart">
            <h2>Your bag is empty.</h2>
            <Link href="/shop" className="btn btn-dark">
              CONTINUE SHOPPING
            </Link>
          </div>
        ) : (
          <div className="checkout-layout">
            <div className="checkout-form">
              <h2>Shipping Information</h2>
              {!user && (
                <p style={{ marginBottom: 18, fontSize: 14, color: "#666" }}>
                  Have an account? <Link href="/login?next=/checkout" style={{ textDecoration: "underline" }}>Log in</Link> to fill this in for you and track your order.
                </p>
              )}
              <form id="checkout-form" onSubmit={placeOrder}>
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" name="name" required value={form.name} onChange={set("name")} autoComplete="name" />
                </div>
                <div className="input-group">
                  <label htmlFor="customer-email">Email Address</label>
                  <input type="email" id="customer-email" name="email" autoComplete="email" required value={form.email} onChange={set("email")} />
                </div>
                <div className="two-columns">
                  <div className="input-group">
                    <label htmlFor="governorate">Governorate</label>
                    <select id="governorate" name="state" required value={form.governorate} onChange={set("governorate")}>
                      <option value="" disabled>
                        Select your governorate
                      </option>
                      {GOVERNORATES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>City</label>
                    <input type="text" name="city" required value={form.city} onChange={set("city")} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Address</label>
                  <textarea name="address" rows={4} required value={form.address} onChange={set("address")}></textarea>
                </div>
                <div className="input-group">
                  <label>Apartment / Building (Optional)</label>
                  <input type="text" name="apartment" value={form.apartment} onChange={set("apartment")} />
                </div>
                <div className="input-group">
                  <label>Mobile Number</label>
                  <input type="tel" name="mobile" required value={form.mobile} onChange={set("mobile")} autoComplete="tel" />
                </div>
                <div className="input-group">
                  <label>Delivery Notes (Optional)</label>
                  <textarea name="notes" rows={3} value={form.notes} onChange={set("notes")}></textarea>
                </div>
              </form>
            </div>

            <aside className="checkout-summary">
              <h2>Your Order</h2>
              <div id="checkout-items">
                {quote?.lines.map((l) => (
                  <div className="summary-row" key={`${l.productId}-${l.size}`}>
                    <span>
                      {l.name} ({l.size}) × {l.quantity}
                    </span>
                    <span>{formatPrice(l.unitCents * l.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="summary-divider"></div>
              <h3>Promo Code</h3>
              <div className="promo-box">
                <input type="text" id="promo-code" placeholder="Enter promo code" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} />
                <button
                  type="button"
                  id="apply-promo"
                  onClick={() => {
                    setPromoMsg("");
                    setPromo(promoInput.trim().toUpperCase());
                  }}
                >
                  Apply
                </button>
              </div>
              <p id="promo-message">{promoMsg}</p>
              <div className="summary-divider"></div>
              <div className="summary-row">
                <span>Subtotal</span>
                <span id="checkout-subtotal">{formatPrice(quote?.subtotalCents ?? 0)}</span>
              </div>
              <div className="summary-row">
                <span>Discount</span>
                <span id="checkout-discount">-{formatPrice(quote?.discountCents ?? 0)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span id="checkout-shipping">{formatPrice(quote?.shippingCents ?? 0)}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total">
                <span>Total</span>
                <span id="checkout-total">{formatPrice(quote?.totalCents ?? 0)}</span>
              </div>
              {error && <p className="form-status error">{error}</p>}
              <p className="consent">
                By placing your order you agree to our <Link href="/terms">Terms of Service</Link>, <Link href="/returns">Returns &amp; Refunds</Link> and <Link href="/privacy">Privacy Policy</Link>.
              </p>
              <button type="submit" form="checkout-form" className="checkout-submit" disabled={busy || !quote || !form.governorate}>
                {busy ? "PLACING ORDER..." : "PLACE ORDER"}
              </button>
              <div className="checkout-info">
                <p>
                  <i className="fa-solid fa-money-bill-wave"></i> Cash on Delivery
                </p>
                <p>
                  <i className="fa-solid fa-truck-fast"></i> Delivery within 2–4 business days
                </p>
                <p>
                  <i className="fa-solid fa-shield-halved"></i> Secure Order Processing
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
