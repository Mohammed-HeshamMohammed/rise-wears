import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import PageShell from "@/components/PageShell";
import ProductCard from "@/components/ProductCard";
import { getProduct, getProducts } from "@/lib/api";
import { SITE_URL, absoluteUrl } from "@/lib/format";
import type { Product } from "@/lib/types";
import ProductView from "./ProductView";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const description = `${p.name} - ${p.subtitle}. ${p.description}`.slice(0, 300);
  const image = p.images[0] ? absoluteUrl(p.images[0].url) : undefined;
  return {
    title: p.name,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { type: "website", title: `${p.name} | RISE`, description, url: `/products/${p.slug}`, images: image ? [{ url: image, alt: p.name }] : undefined },
    twitter: { card: "summary_large_image", title: `${p.name} | RISE`, description, images: image ? [image] : undefined },
  };
}

/** Plain-language answers shown on the page AND sent as FAQPage data, so AI assistants can quote them. */
function faqFor(p: Product) {
  const out: { q: string; a: string }[] = [];
  if (p.fit) out.push({ q: `How does the ${p.name} fit?`, a: `The ${p.name} has an ${p.fit.toLowerCase()} fit. Check the size chart on this page to pick your size.` });
  if (p.material) out.push({ q: `What is the ${p.name} made of?`, a: `It is made from ${p.material}${p.weight ? ` at ${p.weight}` : ""}.` });
  if (p.care) out.push({ q: `How do I care for the ${p.name}?`, a: p.care });
  out.push({ q: "Do you ship across Egypt?", a: "Yes. RISE ships to all governorates in Egypt, with delivery within 2-4 business days and cash on delivery." });
  out.push({ q: "What is the return policy?", a: "You can return items within 14 days of receiving your order." });
  return out;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = (await getProducts()).filter((p) => p.id !== product.id && p.images.length);
  const url = `${SITE_URL}/products/${product.slug}`;
  const images = product.images.map((i) => absoluteUrl(i.url));
  const faq = faqFor(product);
  const validUntil = new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10);

  return (
    <PageShell page="product">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": `${url}#product`,
            name: product.name,
            description: product.description,
            sku: product.sku,
            image: images,
            color: product.color || undefined,
            material: product.material || undefined,
            category: product.category?.name,
            brand: { "@type": "Brand", name: "RISE" },
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: "EGP",
              price: (product.priceCents / 100).toFixed(2),
              priceValidUntil: validUntil,
              itemCondition: "https://schema.org/NewCondition",
              availability: product.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
              seller: { "@type": "Organization", name: "RISE" },
              hasMerchantReturnPolicy: {
                "@type": "MerchantReturnPolicy",
                applicableCountry: "EG",
                returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
                merchantReturnDays: 14,
              },
              shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingDestination: { "@type": "DefinedRegion", addressCountry: "EG" },
                deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" }, transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 4, unitCode: "DAY" } },
              },
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/shop` },
              { "@type": "ListItem", position: 3, name: product.name, item: url },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />

      <section className="breadcrumb">
        <div className="container">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/shop">Shop</Link>
          <span>/</span>
          <span id="breadcrumb-product">{product.name}</span>
        </div>
      </section>

      <section className="product-page">
        <ProductView product={product} />
      </section>

      <section className="product-faq">
        <div className="container">
          <h2>QUESTIONS</h2>
          {faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="related-products">
          <div className="container">
            <h2>YOU MAY ALSO LIKE</h2>
            <div className="product-grid" id="related-products">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
}
