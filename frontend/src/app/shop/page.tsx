import type { Metadata } from "next";
import { Suspense } from "react";
import JsonLd from "@/components/JsonLd";
import NewsletterForm from "@/components/NewsletterForm";
import PageShell from "@/components/PageShell";
import { api, getProducts } from "@/lib/api";
import { SITE_URL, absoluteUrl } from "@/lib/format";
import ShopGrid from "./ShopGrid";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop RISE premium athletic apparel: heavyweight hoodies, sweatshirts and sweatpants. Shipping all over Egypt, 14-day returns.",
  alternates: { canonical: "/shop" },
};

export const revalidate = 60;

export default async function ShopPage() {
  const products = await getProducts();
  const categories = await api<{ name: string; slug: string }[]>("/categories", { revalidate: 60 }).catch(() => []);
  return (
    <PageShell page="shop">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Shop RISE",
            url: `${SITE_URL}/shop`,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: products.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${SITE_URL}/products/${p.slug}`,
                name: p.name,
                image: p.images[0] ? absoluteUrl(p.images[0].url) : undefined,
              })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/shop` },
            ],
          },
        ]}
      />

      <section className="shop-hero">
        <div className="container">
          <span className="section-title">DROP 001</span>
          <h1>ALL TOPS AND PANTS</h1>
          <p>Built for those who Rise Above.</p>
        </div>
      </section>

      <Suspense fallback={null}>
        <ShopGrid products={products} categories={categories} />
      </Suspense>

      <section className="newsletter">
        <div className="container">
          <h2>NEVER MISS A DROP.</h2>
          <p>Subscribe to receive exclusive launches, restocks and upcoming collections.</p>
          <NewsletterForm placeholder="Email Address" buttonClass="btn btn-dark" label="JOIN" />
        </div>
      </section>
    </PageShell>
  );
}
