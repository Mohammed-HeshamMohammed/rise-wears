import { query, one } from "../db.js";

/** One product as JSON, shaped for the storefront and the admin dashboard. */
const PRODUCT_SELECT = `
  SELECT p.id, p.slug, p.legacy_id AS "legacyId", p.sku, p.name, p.subtitle, p.color, p.description,
         p.material, p.weight, p.fit, p.care,
         p.price_cents AS "priceCents", p.compare_price_cents AS "comparePriceCents",
         p.featured, p.coming_soon AS "comingSoon", p.active,
         p.updated_at AS "updatedAt",
         CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) END AS category,
         CASE WHEN co.id IS NULL THEN NULL ELSE json_build_object('id', co.id, 'name', co.name, 'slug', co.slug) END AS collection,
         COALESCE((SELECT json_agg(json_build_object('url', i.url, 'alt', i.alt) ORDER BY i.sort_order, i.id)
                   FROM product_images i WHERE i.product_id = p.id), '[]') AS images,
         COALESCE((SELECT json_agg(json_build_object('size', v.size, 'stock', v.stock) ORDER BY v.sort_order, v.id)
                   FROM product_variants v WHERE v.product_id = p.id), '[]') AS sizes
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN collections co ON co.id = p.collection_id`;

export interface ProductJson {
  id: number;
  slug: string;
  name: string;
  priceCents: number;
  active: boolean;
  images: { url: string; alt: string }[];
  sizes: { size: string; stock: number }[];
  [k: string]: unknown;
}

function decorate(p: ProductJson) {
  return { ...p, soldOut: p.sizes.length > 0 && p.sizes.every((s) => s.stock <= 0) };
}

export async function listProducts(opts: { includeInactive?: boolean; category?: string; collection?: string; featured?: boolean } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (!opts.includeInactive) where.push("p.active = TRUE");
  if (opts.category) {
    params.push(opts.category);
    where.push(`c.slug = $${params.length}`);
  }
  if (opts.collection) {
    params.push(opts.collection);
    where.push(`co.slug = $${params.length}`);
  }
  if (opts.featured) where.push("p.featured = TRUE");
  const rows = await query<ProductJson>(
    `${PRODUCT_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY p.created_at, p.id`,
    params,
  );
  return rows.map(decorate);
}

export async function getProductBySlug(slug: string, includeInactive = false) {
  const row = await one<ProductJson>(
    `${PRODUCT_SELECT} WHERE p.slug = $1 ${includeInactive ? "" : "AND p.active = TRUE"}`,
    [slug],
  );
  return row ? decorate(row) : null;
}

export async function getProductById(id: number) {
  const row = await one<ProductJson>(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  return row ? decorate(row) : null;
}
