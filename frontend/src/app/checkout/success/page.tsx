import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Order placed", robots: { index: false, follow: false } };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string; total?: string }> }) {
  const { order, total } = await searchParams;
  const safeOrder = order && /^RISE-\d+$/.test(order) ? order : null;
  const safeTotal = total && /^\d+$/.test(total) ? Number(total) : null;
  return (
    <PageShell page="checkout">
      <section className="checkout-page">
        <div className="container" style={{ textAlign: "center", maxWidth: 640 }}>
          <h1>THANK YOU.</h1>
          <p style={{ margin: "14px 0 6px", fontSize: 18 }}>Your order is in. We'll contact you to confirm it shortly.</p>
          {safeOrder && (
            <p style={{ fontWeight: 600, margin: "18px 0" }}>
              Order {safeOrder}
              {safeTotal !== null && <> · {formatPrice(safeTotal)} cash on delivery</>}
            </p>
          )}
          <p style={{ color: "#666", marginBottom: 28 }}>Delivery within 2–4 business days.</p>
          <Link href="/account/orders" className="btn btn-dark" style={{ marginRight: 10 }}>
            TRACK MY ORDERS
          </Link>
          <Link href="/shop" className="btn btn-dark">
            CONTINUE SHOPPING
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
