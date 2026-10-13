import { getProducts } from "@/lib/api";
import { SITE_URL, formatPrice } from "@/lib/format";

export const revalidate = 3600;

export async function GET() {
  const products = await getProducts();
  const body = `# RISE - full catalogue

Source: ${SITE_URL}. Prices in Egyptian pounds (EGP). Cash on delivery across Egypt, delivery in 2-4 business days, 14-day returns.

${products
  .map(
    (p) => `## ${p.name}
URL: ${SITE_URL}/products/${p.slug}
SKU: ${p.sku}
Price: ${formatPrice(p.priceCents)}
Category: ${p.category?.name ?? "-"} | Collection: ${p.collection?.name ?? "-"} | Colour: ${p.color || "-"}
Availability: ${p.soldOut ? "Sold out" : "In stock"}
Sizes: ${p.sizes.map((s) => `${s.size} (${s.stock > 0 ? "available" : "sold out"})`).join(", ") || "-"}
Material: ${p.material || "-"} | Weight: ${p.weight || "-"} | Fit: ${p.fit || "-"}
Care: ${p.care || "-"}
${p.subtitle}. ${p.description}
`,
  )
  .join("\n")}`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
