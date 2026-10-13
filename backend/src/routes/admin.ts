import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import express, { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { one, query, tx } from "../db.js";
import { HttpError, requireAdmin } from "../lib/auth.js";
import { GOVERNORATES } from "../lib/checkout.js";
import { getProductById, listProducts } from "../lib/products.js";
import { notifyOrderStatus } from "../lib/mail/index.js";
import { notifyStorefront } from "../lib/revalidate.js";
import { slugify } from "../lib/slug.js";
import { restockOrder } from "./account.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);
// Any successful dashboard change refreshes the public site's cache.
adminRouter.use((req, res, next) => {
  if (req.method !== "GET") res.on("finish", () => res.statusCode < 400 && notifyStorefront());
  next();
});

const idParam = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Bad id");
  return n;
};

/* ------------------------------ dashboard ------------------------------ */

adminRouter.get("/stats", async (_req, res) => {
  const o = await one(
    `SELECT count(*)::int AS orders,
            count(*) FILTER (WHERE status = 'pending')::int AS pending,
            COALESCE(sum(total_cents) FILTER (WHERE status NOT IN ('canceled','returned')), 0)::bigint AS "revenueCents"
     FROM orders`,
  );
  const p = await one(`SELECT count(*)::int AS products, count(*) FILTER (WHERE active)::int AS active FROM products`);
  const c = await one(`SELECT count(*)::int AS customers FROM users WHERE role = 'customer'`);
  const s = await one(`SELECT count(*)::int AS subscribers FROM newsletter_subscribers`);
  res.json({ ...o, revenueCents: Number(o.revenueCents), ...p, ...c, ...s });
});

/* ------------------------------ products ------------------------------ */

const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().max(100).optional(),
  sku: z.string().trim().min(1).max(60),
  subtitle: z.string().trim().max(200).default(""),
  color: z.string().trim().max(60).default(""),
  description: z.string().trim().max(4000).default(""),
  material: z.string().trim().max(200).default(""),
  weight: z.string().trim().max(60).default(""),
  fit: z.string().trim().max(60).default(""),
  care: z.string().trim().max(400).default(""),
  priceCents: z.number().int().min(0).max(100_000_000),
  comparePriceCents: z.number().int().min(0).nullable().default(null),
  categoryId: z.number().int().nullable().default(null),
  collectionId: z.number().int().nullable().default(null),
  featured: z.boolean().default(false),
  comingSoon: z.boolean().default(false),
  active: z.boolean().default(true),
  images: z.array(z.object({ url: z.string().min(1).max(500), alt: z.string().max(200).default("") })).max(12).default([]),
  sizes: z.array(z.object({ size: z.string().trim().min(1).max(10), stock: z.number().int().min(0).max(100000) })).max(20).default([]),
});

async function saveProduct(id: number | null, body: unknown) {
  const p = productSchema.parse(body);
  const base = slugify(p.slug || p.name);
  return tx(async (db) => {
    let slug = base;
    for (let n = 2; ; n++) {
      const clash = (await db.query("SELECT id FROM products WHERE slug = $1 AND id IS DISTINCT FROM $2", [slug, id])).rows[0];
      if (!clash) break;
      slug = `${base}-${n}`;
    }
    const vals = [slug, p.sku, p.name, p.subtitle, p.color, p.description, p.material, p.weight, p.fit, p.care,
      p.priceCents, p.comparePriceCents, p.categoryId, p.collectionId, p.featured, p.comingSoon, p.active];
    let pid = id;
    if (id === null) {
      pid = (
        await db.query(
          `INSERT INTO products (slug, sku, name, subtitle, color, description, material, weight, fit, care,
             price_cents, compare_price_cents, category_id, collection_id, featured, coming_soon, active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
          vals,
        )
      ).rows[0].id;
    } else {
      const r = await db.query(
        `UPDATE products SET slug=$1, sku=$2, name=$3, subtitle=$4, color=$5, description=$6, material=$7, weight=$8,
           fit=$9, care=$10, price_cents=$11, compare_price_cents=$12, category_id=$13, collection_id=$14,
           featured=$15, coming_soon=$16, active=$17, updated_at=now() WHERE id=$18`,
        [...vals, id],
      );
      if (!r.rowCount) throw new HttpError(404, "Product not found");
    }
    await db.query("DELETE FROM product_images WHERE product_id = $1", [pid]);
    for (const [i, img] of p.images.entries()) {
      await db.query("INSERT INTO product_images (product_id, url, alt, sort_order) VALUES ($1,$2,$3,$4)", [
        pid, img.url, img.alt || p.name, i,
      ]);
    }
    const sizes = p.sizes.map((s) => s.size);
    await db.query("DELETE FROM product_variants WHERE product_id = $1 AND NOT (size = ANY($2::text[]))", [pid, sizes]);
    for (const [i, s] of p.sizes.entries()) {
      await db.query(
        `INSERT INTO product_variants (product_id, size, stock, sort_order) VALUES ($1,$2,$3,$4)
         ON CONFLICT (product_id, size) DO UPDATE SET stock = EXCLUDED.stock, sort_order = EXCLUDED.sort_order`,
        [pid, s.size, s.stock, i],
      );
    }
    return pid!;
  });
}

adminRouter.get("/products", async (_req, res) => {
  res.json(await listProducts({ includeInactive: true }));
});
adminRouter.get("/products/:id", async (req, res) => {
  const p = await getProductById(idParam(req.params.id));
  if (!p) throw new HttpError(404, "Product not found");
  res.json(p);
});
adminRouter.post("/products", async (req, res) => {
  res.status(201).json(await getProductById(await saveProduct(null, req.body)));
});
adminRouter.put("/products/:id", async (req, res) => {
  res.json(await getProductById(await saveProduct(idParam(req.params.id), req.body)));
});
adminRouter.delete("/products/:id", async (req, res) => {
  await query("DELETE FROM products WHERE id = $1", [idParam(req.params.id)]);
  res.status(204).end();
});

/* ------------------------------ categories + collections ------------------------------ */

const taxonomySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80).optional(),
  sortOrder: z.number().int().default(0),
});

for (const table of ["categories", "collections"] as const) {
  const path = `/${table}`;
  adminRouter.get(path, async (_req, res) => {
    res.json(await query(`SELECT id, name, slug, sort_order AS "sortOrder" FROM ${table} ORDER BY sort_order, id`));
  });
  adminRouter.post(path, async (req, res) => {
    const b = taxonomySchema.parse(req.body);
    res.status(201).json(
      await one(
        `INSERT INTO ${table} (name, slug, sort_order) VALUES ($1,$2,$3) RETURNING id, name, slug, sort_order AS "sortOrder"`,
        [b.name, slugify(b.slug || b.name), b.sortOrder],
      ),
    );
  });
  adminRouter.put(`${path}/:id`, async (req, res) => {
    const b = taxonomySchema.parse(req.body);
    const row = await one(
      `UPDATE ${table} SET name=$2, slug=$3, sort_order=$4 WHERE id=$1 RETURNING id, name, slug, sort_order AS "sortOrder"`,
      [idParam(req.params.id), b.name, slugify(b.slug || b.name), b.sortOrder],
    );
    if (!row) throw new HttpError(404, "Not found");
    res.json(row);
  });
  adminRouter.delete(`${path}/:id`, async (req, res) => {
    await query(`DELETE FROM ${table} WHERE id = $1`, [idParam(req.params.id)]);
    res.status(204).end();
  });
}

/* ------------------------------ announcement bar ------------------------------ */

const announcementSchema = z.object({
  text: z.string().trim().min(1).max(200),
  link: z.string().trim().max(300).default(""),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
const ANN_COLS = `id, text, link, active, sort_order AS "sortOrder"`;

adminRouter.get("/announcements", async (_req, res) => {
  res.json(await query(`SELECT ${ANN_COLS} FROM announcements ORDER BY sort_order, id`));
});
adminRouter.post("/announcements", async (req, res) => {
  const b = announcementSchema.parse(req.body);
  res.status(201).json(
    await one(`INSERT INTO announcements (text, link, active, sort_order) VALUES ($1,$2,$3,$4) RETURNING ${ANN_COLS}`, [
      b.text, b.link, b.active, b.sortOrder,
    ]),
  );
});
adminRouter.put("/announcements/:id", async (req, res) => {
  const b = announcementSchema.parse(req.body);
  const row = await one(
    `UPDATE announcements SET text=$2, link=$3, active=$4, sort_order=$5 WHERE id=$1 RETURNING ${ANN_COLS}`,
    [idParam(req.params.id), b.text, b.link, b.active, b.sortOrder],
  );
  if (!row) throw new HttpError(404, "Not found");
  res.json(row);
});
adminRouter.delete("/announcements/:id", async (req, res) => {
  await query("DELETE FROM announcements WHERE id = $1", [idParam(req.params.id)]);
  res.status(204).end();
});

/* ------------------------------ deals ------------------------------ */

const dealSchema = z.object({
  name: z.string().trim().min(1).max(120),
  buyQty: z.number().int().min(1).max(10),
  discountPercent: z.number().int().min(1).max(100),
  active: z.boolean().default(true),
  startsAt: z.string().nullable().default(null),
  endsAt: z.string().nullable().default(null),
  productIds: z.array(z.number().int()).default([]),
});
const DEAL_SELECT = `SELECT d.id, d.name, d.buy_qty AS "buyQty", d.discount_percent AS "discountPercent", d.active,
  d.starts_at AS "startsAt", d.ends_at AS "endsAt",
  COALESCE((SELECT json_agg(product_id) FROM deal_products WHERE deal_id = d.id), '[]') AS "productIds" FROM deals d`;

async function saveDeal(id: number | null, body: unknown) {
  const d = dealSchema.parse(body);
  return tx(async (db) => {
    let did = id;
    if (id === null) {
      did = (
        await db.query(
          `INSERT INTO deals (name, buy_qty, discount_percent, active, starts_at, ends_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [d.name, d.buyQty, d.discountPercent, d.active, d.startsAt, d.endsAt],
        )
      ).rows[0].id;
    } else {
      const r = await db.query(
        `UPDATE deals SET name=$2, buy_qty=$3, discount_percent=$4, active=$5, starts_at=$6, ends_at=$7 WHERE id=$1`,
        [id, d.name, d.buyQty, d.discountPercent, d.active, d.startsAt, d.endsAt],
      );
      if (!r.rowCount) throw new HttpError(404, "Deal not found");
    }
    await db.query("DELETE FROM deal_products WHERE deal_id = $1", [did]);
    for (const pid of d.productIds) {
      await db.query("INSERT INTO deal_products (deal_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [did, pid]);
    }
    return did!;
  });
}

adminRouter.get("/deals", async (_req, res) => {
  res.json(await query(`${DEAL_SELECT} ORDER BY d.id`));
});
adminRouter.post("/deals", async (req, res) => {
  res.status(201).json(await one(`${DEAL_SELECT} WHERE d.id = $1`, [await saveDeal(null, req.body)]));
});
adminRouter.put("/deals/:id", async (req, res) => {
  res.json(await one(`${DEAL_SELECT} WHERE d.id = $1`, [await saveDeal(idParam(req.params.id), req.body)]));
});
adminRouter.delete("/deals/:id", async (req, res) => {
  await query("DELETE FROM deals WHERE id = $1", [idParam(req.params.id)]);
  res.status(204).end();
});

/* ------------------------------ promo codes ------------------------------ */

const promoSchema = z.object({
  code: z.string().trim().min(2).max(40).transform((s) => s.toUpperCase()),
  type: z.enum(["percent", "fixed"]),
  value: z.number().int().min(1),
  description: z.string().trim().max(200).default(""),
  active: z.boolean().default(true),
  expiresAt: z.string().nullable().default(null),
});
const PROMO_COLS = `id, code, type, value, description, active, expires_at AS "expiresAt"`;

function checkPromo(p: z.infer<typeof promoSchema>) {
  if (p.type === "percent" && p.value > 100) throw new HttpError(400, "Percent can't be more than 100.");
}

adminRouter.get("/promo-codes", async (_req, res) => {
  res.json(await query(`SELECT ${PROMO_COLS} FROM promo_codes ORDER BY id`));
});
adminRouter.post("/promo-codes", async (req, res) => {
  const b = promoSchema.parse(req.body);
  checkPromo(b);
  res.status(201).json(
    await one(
      `INSERT INTO promo_codes (code, type, value, description, active, expires_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${PROMO_COLS}`,
      [b.code, b.type, b.value, b.description, b.active, b.expiresAt],
    ),
  );
});
adminRouter.put("/promo-codes/:id", async (req, res) => {
  const b = promoSchema.parse(req.body);
  checkPromo(b);
  const row = await one(
    `UPDATE promo_codes SET code=$2, type=$3, value=$4, description=$5, active=$6, expires_at=$7 WHERE id=$1 RETURNING ${PROMO_COLS}`,
    [idParam(req.params.id), b.code, b.type, b.value, b.description, b.active, b.expiresAt],
  );
  if (!row) throw new HttpError(404, "Not found");
  res.json(row);
});
adminRouter.delete("/promo-codes/:id", async (req, res) => {
  await query("DELETE FROM promo_codes WHERE id = $1", [idParam(req.params.id)]);
  res.status(204).end();
});

/* ------------------------------ shipping ------------------------------ */

adminRouter.get("/shipping-rates", async (_req, res) => {
  res.json(await query(`SELECT governorate, cost_cents AS "costCents" FROM shipping_rates ORDER BY governorate`));
});
adminRouter.put("/shipping-rates", async (req, res) => {
  const rates = z
    .array(z.object({ governorate: z.enum(GOVERNORATES), costCents: z.number().int().min(0).max(1_000_000) }))
    .parse(req.body);
  await tx(async (db) => {
    for (const r of rates) {
      await db.query(
        `INSERT INTO shipping_rates (governorate, cost_cents) VALUES ($1,$2)
         ON CONFLICT (governorate) DO UPDATE SET cost_cents = EXCLUDED.cost_cents`,
        [r.governorate, r.costCents],
      );
    }
  });
  res.json({ ok: true });
});

/* ------------------------------ orders ------------------------------ */

const STATUS_FLOW: Record<string, string[]> = {
  pending: ["confirmed", "canceled"],
  confirmed: ["shipped", "canceled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  canceled: [],
  returned: [],
};

const ORDER_LIST = `SELECT o.id, o.order_number AS "orderNumber", o.status, o.created_at AS "createdAt",
  o.customer_name AS "customerName", o.email, o.mobile, o.governorate, o.total_cents AS "totalCents",
  (SELECT COALESCE(sum(quantity), 0)::int FROM order_items WHERE order_id = o.id) AS "itemCount"
  FROM orders o`;

adminRouter.get("/orders", async (req, res) => {
  const where: string[] = [];
  const params: unknown[] = [];
  if (typeof req.query.status === "string" && req.query.status) {
    params.push(req.query.status);
    where.push(`o.status = $${params.length}`);
  }
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    params.push(`%${req.query.q.trim()}%`);
    where.push(`(o.order_number ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.email ILIKE $${params.length} OR o.mobile ILIKE $${params.length})`);
  }
  res.json(await query(`${ORDER_LIST} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY o.created_at DESC LIMIT 300`, params));
});

adminRouter.get("/orders/:id", async (req, res) => {
  const o = await one(
    `SELECT o.*, o.order_number AS "orderNumber",
       COALESCE((SELECT json_agg(i ORDER BY i.id) FROM order_items i WHERE i.order_id = o.id), '[]') AS items,
       COALESCE((SELECT json_agg(h ORDER BY h.id) FROM order_status_history h WHERE h.order_id = o.id), '[]') AS history
     FROM orders o WHERE o.id = $1`,
    [idParam(req.params.id)],
  );
  if (!o) throw new HttpError(404, "Order not found");
  res.json(o);
});

adminRouter.patch("/orders/:id/status", async (req, res) => {
  const { status, note } = z
    .object({
      status: z.enum(["pending", "confirmed", "shipped", "delivered", "canceled", "returned"]),
      note: z.string().max(300).default(""),
    })
    .parse(req.body);
  const id = idParam(req.params.id);
  await tx(async (db) => {
    const o = (await db.query("SELECT status FROM orders WHERE id = $1 FOR UPDATE", [id])).rows[0];
    if (!o) throw new HttpError(404, "Order not found");
    if (!STATUS_FLOW[o.status]?.includes(status)) throw new HttpError(409, `Can't move an order from ${o.status} to ${status}.`);
    if (status === "canceled") await restockOrder(db, id);
    await db.query("UPDATE orders SET status = $2 WHERE id = $1", [id, status]);
    await db.query("INSERT INTO order_status_history (order_id, status, note) VALUES ($1,$2,$3)", [id, status, note]);
  });
  void notifyOrderStatus(id);
  res.json({ ok: true, status });
});

/* ------------------------------ people + inbox ------------------------------ */

adminRouter.get("/customers", async (_req, res) => {
  res.json(
    await query(
      `SELECT u.id, u.email, u.name, u.mobile, u.created_at AS "createdAt",
              (SELECT count(*)::int FROM orders WHERE user_id = u.id) AS "orderCount"
       FROM users u WHERE u.role = 'customer' ORDER BY u.created_at DESC LIMIT 500`,
    ),
  );
});

adminRouter.get("/subscribers", async (req, res) => {
  const rows = await query(`SELECT id, email, created_at AS "createdAt" FROM newsletter_subscribers ORDER BY id DESC`);
  if (req.query.format === "csv") {
    res.type("text/csv").send("email,subscribed_at\n" + rows.map((r) => `${r.email},${new Date(r.createdAt).toISOString()}`).join("\n"));
    return;
  }
  res.json(rows);
});

adminRouter.get("/messages", async (_req, res) => {
  res.json(await query(`SELECT id, name, email, subject, message, created_at AS "createdAt" FROM contact_messages ORDER BY id DESC LIMIT 200`));
});

/* ------------------------------ image upload ------------------------------ */

function sniffImage(b: Buffer): "jpg" | "png" | "webp" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

adminRouter.post("/uploads", express.raw({ type: "image/*", limit: "6mb" }), (req, res) => {
  const body = req.body as Buffer;
  if (!Buffer.isBuffer(body) || !body.length) throw new HttpError(400, "Send the image as the raw request body.");
  const ext = sniffImage(body); // trust the bytes, not the Content-Type header
  if (!ext) throw new HttpError(400, "Only JPG, PNG or WebP images are allowed.");
  const dir = resolve(config.UPLOAD_DIR);
  mkdirSync(dir, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  writeFileSync(join(dir, name), body);
  res.status(201).json({ url: `${config.PUBLIC_API_URL}/uploads/${name}` });
});
