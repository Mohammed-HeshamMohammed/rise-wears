import { z } from "zod";
import type { Db } from "../db.js";
import { HttpError } from "./errors.js";
import { computeTotals, type DealRule, type PromoRule, type Totals } from "./pricing.js";

export const GOVERNORATES = [
  "Cairo", "Alexandria", "Port Said", "Suez", "Giza", "Damietta", "Dakahlia", "Sharkia", "Qalyubia",
  "Kafr el-Sheikh", "Gharbia", "Menoufia", "El-Beheira", "Ismailia", "Bani Suef", "Fayoum", "Minya",
  "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "The Red Sea", "The New Valley", "Matrouh",
  "North Sinai", "South Sinai",
] as const;

export const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  size: z.string().min(1).max(10),
  quantity: z.number().int().min(1).max(20),
});

export const quoteSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  governorate: z.string().optional(),
  promoCode: z.string().max(40).optional(),
});

export interface QuoteLine {
  productId: number;
  slug: string;
  variantId: number;
  name: string;
  color: string;
  size: string;
  quantity: number;
  unitCents: number;
  stock: number;
  imageUrl: string;
}

export interface Quote extends Totals {
  lines: QuoteLine[];
  promoMessage: string | null;
  deal: { name: string; buyQty: number; discountPercent: number } | null;
}

function mergeItems(items: z.infer<typeof cartItemSchema>[]) {
  const map = new Map<string, z.infer<typeof cartItemSchema>>();
  for (const it of items) {
    const key = `${it.productId}:${it.size}`;
    const cur = map.get(key);
    map.set(key, cur ? { ...cur, quantity: Math.min(20, cur.quantity + it.quantity) } : { ...it });
  }
  return [...map.values()];
}

export async function loadActiveDeal(db: Db): Promise<(DealRule & { name: string }) | null> {
  const { rows } = await db.query(
    `SELECT d.id, d.name, d.buy_qty, d.discount_percent,
            COALESCE((SELECT array_agg(product_id) FROM deal_products WHERE deal_id = d.id), '{}') AS product_ids
     FROM deals d
     WHERE d.active AND (d.starts_at IS NULL OR d.starts_at <= now()) AND (d.ends_at IS NULL OR d.ends_at >= now())
     ORDER BY d.discount_percent DESC, d.id LIMIT 1`,
  );
  const d = rows[0];
  return d ? { name: d.name, buyQty: d.buy_qty, discountPercent: d.discount_percent, productIds: d.product_ids } : null;
}

export async function loadPromo(db: Db, code: string): Promise<{ promo: PromoRule | null; message: string | null }> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { promo: null, message: null };
  const { rows } = await db.query("SELECT * FROM promo_codes WHERE code = $1", [clean]);
  const p = rows[0];
  if (!p) return { promo: null, message: "Promo code doesn't exist." };
  if (!p.active) return { promo: null, message: "This promo code is currently inactive." };
  if (p.expires_at && new Date(p.expires_at) < new Date()) return { promo: null, message: "This promo code has expired." };
  return { promo: { code: p.code, type: p.type, value: p.value }, message: null };
}

// With `lock`, variants are row-locked so the caller can decrement stock in the same transaction.
export async function buildQuote(db: Db, input: z.infer<typeof quoteSchema>, lock = false): Promise<Quote> {
  const items = mergeItems(input.items);
  const lines: QuoteLine[] = [];
  for (const it of items) {
    const { rows } = await db.query(
      `SELECT p.id AS product_id, p.slug, p.name, p.color, p.price_cents, p.active, p.coming_soon,
              v.id AS variant_id, v.stock,
              COALESCE((SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1), '') AS image_url
       FROM products p JOIN product_variants v ON v.product_id = p.id
       WHERE p.id = $1 AND v.size = $2 ${lock ? "FOR UPDATE OF v" : ""}`,
      [it.productId, it.size],
    );
    const r = rows[0];
    if (!r || !r.active || r.coming_soon) throw new HttpError(400, "One of the items in your bag is no longer available.");
    lines.push({
      productId: r.product_id, slug: r.slug, variantId: r.variant_id, name: r.name, color: r.color, size: it.size,
      quantity: it.quantity, unitCents: r.price_cents, stock: r.stock, imageUrl: r.image_url,
    });
  }

  let shippingCents = 0;
  if (input.governorate) {
    const { rows } = await db.query("SELECT cost_cents FROM shipping_rates WHERE governorate = $1", [input.governorate]);
    if (!rows[0]) throw new HttpError(400, "We don't ship to that governorate yet.");
    shippingCents = rows[0].cost_cents;
  }

  const deal = await loadActiveDeal(db);
  const { promo, message } = input.promoCode ? await loadPromo(db, input.promoCode) : { promo: null, message: null };
  const totals = computeTotals({
    lines: lines.map((l) => ({ productId: l.productId, unitCents: l.unitCents, quantity: l.quantity })),
    deal,
    promo,
    shippingCents,
  });
  return {
    ...totals,
    lines,
    promoMessage: message,
    deal: deal ? { name: deal.name, buyQty: deal.buyQty, discountPercent: deal.discountPercent } : null,
  };
}
