import { getProducts } from "@/lib/api";
import { SITE_URL, absoluteUrl } from "@/lib/format";

export const revalidate = 3600;

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** Google Merchant Center product feed (RSS 2.0 + g: namespace). Submit this URL in Merchant Center. */
export async function GET() {
  const products = await getProducts();
  const items = products
    .filter((p) => p.images.length > 0 && !p.comingSoon)
    .map((p) => {
      const imgs = p.images.map((i) => absoluteUrl(i.url));
      return `    <item>
      <g:id>${esc(p.sku)}</g:id>
      <g:title>${esc(p.name)}</g:title>
      <g:description>${esc(`${p.subtitle}. ${p.description}`)}</g:description>
      <g:link>${SITE_URL}/products/${p.slug}</g:link>
      <g:image_link>${esc(imgs[0]!)}</g:image_link>
${imgs.slice(1, 10).map((u) => `      <g:additional_image_link>${esc(u)}</g:additional_image_link>`).join("\n")}
      <g:availability>${p.soldOut ? "out_of_stock" : "in_stock"}</g:availability>
      <g:price>${(p.priceCents / 100).toFixed(2)} EGP</g:price>
      <g:brand>RISE</g:brand>
      <g:condition>new</g:condition>
      <g:color>${esc(p.color)}</g:color>
      <g:material>${esc(p.material)}</g:material>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
      <g:product_type>${esc(p.category?.name ?? "Apparel")}</g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>RISE</title>
    <link>${SITE_URL}</link>
    <description>RISE premium athletic apparel</description>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
