import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/api";
import CartView from "./CartView";

export const metadata: Metadata = { title: "Shopping Cart", robots: { index: false, follow: true } };

export default async function CartPage() {
  const products = (await getProducts()).filter((p) => p.images.length).slice(0, 4);
  return (
    <PageShell page="cart">
      <CartView />
      {products.length > 0 && (
        <section className="related-products">
          <div className="container">
            <h2>YOU MAY ALSO LIKE</h2>
            <div className="product-grid" id="recommended-products">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
}
