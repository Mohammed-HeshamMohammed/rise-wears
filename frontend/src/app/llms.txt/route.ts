import { getProducts } from "@/lib/api";
import { SITE_URL, formatPrice } from "@/lib/format";

export const revalidate = 3600;

export async function GET() {
  const products = await getProducts();
  const body = `# RISE

> RISE is an Egyptian premium athletic apparel brand ("Rise Above"). Heavyweight 100% cotton hoodies, sweatshirts and sweatpants, manufactured entirely in Egypt. Prices in EGP, shipping to all governorates in Egypt, cash on delivery, 14-day returns.

## Key facts
- Brand: RISE (RISE Apparel), website ${SITE_URL}
- Country: Egypt. Currency: EGP. Language: English.
- Payment: cash on delivery. Delivery: 2-4 business days. Returns: within 14 days.
- Current offer: buy 2 items, get 50% off the 3rd.
- Contact: inquiries@rise-wear.store

## Pages
- [Home](${SITE_URL}/): brand statement and new arrivals
- [Shop](${SITE_URL}/shop): all products
- [About](${SITE_URL}/about): the RISE story and values
- [Contact](${SITE_URL}/contact): contact form and FAQ
- [Shipping & Delivery](${SITE_URL}/shipping): delivery fees by governorate, 2-4 business days, cash on delivery
- [Returns & Refunds](${SITE_URL}/returns): 14-day returns, size exchanges within 7 days
- [Terms of Service](${SITE_URL}/terms) and [Privacy Policy](${SITE_URL}/privacy)

## Products
${products.map((p) => `- [${p.name}](${SITE_URL}/products/${p.slug}): ${p.subtitle}. ${formatPrice(p.priceCents)}${p.soldOut ? " (sold out)" : ""}`).join("\n")}

## More
- [Full catalogue for LLMs](${SITE_URL}/llms-full.txt)
- [Sitemap](${SITE_URL}/sitemap.xml)
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
