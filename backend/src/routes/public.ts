import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { one, pool, query, tx } from "../db.js";
import { optionalAuth } from "../lib/auth.js";
import { HttpError } from "../lib/errors.js";
import { buildQuote, GOVERNORATES, loadPromo, quoteSchema } from "../lib/checkout.js";
import { getProductBySlug, listProducts } from "../lib/products.js";
import { notifyContact, notifyNewsletter, notifyOrderPlaced } from "../lib/mail/index.js";
import { notifyStorefront } from "../lib/revalidate.js";

export const publicRouter = Router();

const writeLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });

publicRouter.get("/products", async (req, res) => {
  const q = req.query;
  res.json(
    await listProducts({
      category: typeof q.category === "string" ? q.category : undefined,
      collection: typeof q.collection === "string" ? q.collection : undefined,
      featured: q.featured === "1" || q.featured === "true",
    }),
  );
});

publicRouter.get("/products/:slug", async (req, res) => {
  const p = await getProductBySlug(String(req.params.slug));
  if (!p) throw new HttpError(404, "Product not found");
  res.json(p);
});

publicRouter.get("/categories", async (_req, res) => {
  res.json(await query("SELECT id, name, slug FROM categories ORDER BY sort_order, id"));
});

publicRouter.get("/collections", async (_req, res) => {
  res.json(await query("SELECT id, name, slug FROM collections ORDER BY sort_order, id"));
});

publicRouter.get("/announcements", async (_req, res) => {
  res.json(await query("SELECT id, text, link FROM announcements WHERE active ORDER BY sort_order, id"));
});

publicRouter.get("/shipping-rates", async (_req, res) => {
  res.json(await query(`SELECT governorate, cost_cents AS "costCents" FROM shipping_rates ORDER BY governorate`));
});

publicRouter.get("/governorates", (_req, res) => {
  res.json(GOVERNORATES);
});

publicRouter.post("/checkout/quote", async (req, res) => {
  const input = quoteSchema.parse(req.body);
  res.json(await buildQuote(pool, input));
});

publicRouter.post("/promo/validate", writeLimiter, async (req, res) => {
  const { code } = z.object({ code: z.string().min(1).max(40) }).parse(req.body);
  const { promo, message } = await loadPromo(pool, code);
  if (!promo) return res.json({ valid: false, message });
  res.json({ valid: true, code: promo.code, type: promo.type, value: promo.value });
});

const orderSchema = quoteSchema.extend({
  governorate: z.enum(GOVERNORATES),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(200),
    mobile: z.string().trim().min(7).max(20),
    city: z.string().trim().min(1).max(120),
    address: z.string().trim().min(3).max(500),
    apartment: z.string().trim().max(200).optional().default(""),
    notes: z.string().trim().max(500).optional().default(""),
  }),
});

publicRouter.post("/orders", writeLimiter, optionalAuth, async (req, res) => {
  const input = orderSchema.parse(req.body);
  const c = input.customer;

  const result = await tx(async (db) => {
    const quote = await buildQuote(db, input, true);
    for (const l of quote.lines) {
      if (l.stock < l.quantity) {
        throw new HttpError(
          409,
          l.stock <= 0 ? `${l.name} (${l.size}) just sold out.` : `Only ${l.stock} left of ${l.name} (${l.size}).`,
        );
      }
    }
    const seq = (await db.query("SELECT nextval('order_number_seq') AS n")).rows[0].n;
    const orderNumber = `RISE-${seq}`;
    const order = (
      await db.query(
        `INSERT INTO orders (order_number, user_id, customer_name, email, mobile, governorate, city, address, apartment,
                             notes, promo_code, subtotal_cents, discount_cents, shipping_cents, total_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
        [orderNumber, req.user?.id ?? null, c.name, c.email, c.mobile, input.governorate, c.city, c.address,
         c.apartment, c.notes, quote.appliedPromo, quote.subtotalCents, quote.discountCents, quote.shippingCents,
         quote.totalCents],
      )
    ).rows[0];
    for (const l of quote.lines) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, product_name, color, size, quantity, unit_price_cents, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [order.id, l.productId, l.name, l.color, l.size, l.quantity, l.unitCents, l.imageUrl],
      );
      await db.query("UPDATE product_variants SET stock = stock - $1 WHERE id = $2", [l.quantity, l.variantId]);
    }
    await db.query("INSERT INTO order_status_history (order_id, status, note) VALUES ($1,'pending','Order placed')", [
      order.id,
    ]);
    return { orderId: order.id as number, orderNumber, quote };
  });

  notifyStorefront();
  void notifyOrderPlaced(result.orderId);
  res.status(201).json({
    orderNumber: result.orderNumber,
    totalCents: result.quote.totalCents,
    subtotalCents: result.quote.subtotalCents,
    discountCents: result.quote.discountCents,
    shippingCents: result.quote.shippingCents,
  });
});

publicRouter.post("/newsletter", writeLimiter, async (req, res) => {
  const { email } = z.object({ email: z.email().max(200) }).parse(req.body);
  const added = await one("INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id", [email.toLowerCase()]);
  if (added) notifyNewsletter(email);
  res.status(201).json({ ok: true });
});

publicRouter.post("/contact", writeLimiter, async (req, res) => {
  const b = z
    .object({
      name: z.string().trim().min(1).max(120),
      email: z.email().max(200),
      subject: z.string().trim().max(200).optional().default(""),
      message: z.string().trim().min(1).max(4000),
    })
    .parse(req.body);
  await query("INSERT INTO contact_messages (name, email, subject, message) VALUES ($1,$2,$3,$4)", [
    b.name, b.email, b.subject, b.message,
  ]);
  notifyContact(b);
  res.status(201).json({ ok: true });
});
