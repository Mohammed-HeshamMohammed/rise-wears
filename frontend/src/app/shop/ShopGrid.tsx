"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/types";

export default function ShopGrid({ products, categories }: { products: Product[]; categories: { name: string; slug: string }[] }) {
  const fromUrl = useSearchParams().get("category")?.toLowerCase() ?? "all";
  const [filter, setFilter] = useState(categories.some((c) => c.slug === fromUrl) ? fromUrl : "all");
  const shown = filter === "all" ? products : products.filter((p) => p.category?.slug === filter);

  return (
    <>
      <section className="shop-filters">
        <div className="container">
          <button className={`filter${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
            All
          </button>
          {categories.map((c) => (
            <button key={c.slug} className={`filter${filter === c.slug ? " active" : ""}`} onClick={() => setFilter(c.slug)}>
              {c.name}
            </button>
          ))}
        </div>
      </section>

      <section className="shop-products">
        <div className="container">
          <div id="product-grid" className="product-grid">
            {shown.length === 0 ? (
              <div className="empty-shop">
                <h2>No Products Found</h2>
                <p>There are currently no products in this category.</p>
              </div>
            ) : (
              shown.map((p) => <ProductCard key={p.id} product={p} shopButton />)
            )}
          </div>
        </div>
      </section>
    </>
  );
}
