import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import NewsletterForm from "@/components/NewsletterForm";
import PageShell from "@/components/PageShell";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/api";
import { SITE_URL, absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: { absolute: "RISE | Rise Above" },
  description: "Premium athletic apparel designed for those who refuse to settle. Rise Above.",
  alternates: { canonical: "/" },
};

export const revalidate = 60;

export default async function HomePage() {
  const featured = await getProducts("?featured=1");
  return (
    <PageShell page="home">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "New arrivals",
          itemListElement: featured.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/products/${p.slug}`,
            name: p.name,
            image: p.images[0] ? absoluteUrl(p.images[0].url) : undefined,
          })),
        }}
      />

      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>RISE</h1>
          <p className="hero-slogan">RISE ABOVE</p>
          <p className="hero-description">Built for those chasing the next level.</p>
          <Link href="/shop" className="btn btn-light">
            SHOP COLLECTION
          </Link>
        </div>
      </section>

      <section className="statement" id="about">
        <div className="container">
          <h2>THE ONLY DIRECTION IS UP.</h2>
          <p>Every workout. Every setback. Every victory. Rise Above.</p>
        </div>
      </section>

      <section className="featured">
        <div className="featured-image">
          <img src="/images/collection.jpg" alt="Rise Collection" />
        </div>
        <div className="featured-content">
          <span className="section-title">FEATURED COLLECTION</span>
          <h2>NEW COLLECTION</h2>
          <p>The next chapter of Rise is here. Explore the latest pieces built for movement, comfort and progression.</p>
          <Link href="/shop" className="btn btn-dark">
            VIEW COLLECTION
          </Link>
        </div>
      </section>

      <section className="products" id="shop">
        <div className="container">
          <h2>NEW ARRIVALS</h2>
          <div className="product-grid" id="home-products">
            {featured.length === 0 ? (
              <div className="home-empty-products">
                <p>New products coming soon.</p>
              </div>
            ) : (
              featured.map((p) => <ProductCard key={p.id} product={p} />)
            )}
          </div>
        </div>
      </section>

      <section className="why-rise">
        <div className="container">
          <div className="feature-card">
            <h3>PERFORMANCE</h3>
            <p>Built for movement.</p>
          </div>
          <div className="feature-card">
            <h3>COMFORT</h3>
            <p>Premium materials designed for everyday wear.</p>
          </div>
          <div className="feature-card">
            <h3>PROGRESSION</h3>
            <p>Rise Above.</p>
          </div>
        </div>
      </section>

      <section className="quote">
        <h2>RISE ABOVE.</h2>
      </section>

      <section className="newsletter" id="newsletter">
        <div className="container">
          <h2>JOIN THE MOVEMENT</h2>
          <p>Be the first to hear about new drops, exclusive offers and upcoming collections.</p>
          <NewsletterForm placeholder="Your Email Address" label="SUBSCRIBE" />
        </div>
      </section>
    </PageShell>
  );
}
