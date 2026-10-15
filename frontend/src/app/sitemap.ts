import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/api";
import { SITE_URL, absoluteUrl } from "@/lib/format";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
    ...["terms", "privacy", "shipping", "returns"].map((p) => ({ url: `${SITE_URL}/${p}`, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
  return [
    ...pages,
    ...products.map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.map((i) => absoluteUrl(i.url)),
    })),
  ];
}
