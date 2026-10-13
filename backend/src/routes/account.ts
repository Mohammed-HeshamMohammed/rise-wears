import { Router } from "express";
import { z } from "zod";
import { one, query, tx, type Db } from "../db.js";
import { HttpError, requireAuth } from "../lib/auth.js";
import { GOVERNORATES } from "../lib/checkout.js";
import { notifyOrderStatus } from "../lib/mail/index.js";

export const accountRouter = Router();
accountRouter.use("/me", requireAuth);

/* ------------------------------ profile ------------------------------ */

accountRouter.get("/me", (req, res) => {
  const u = req.user!;
  res.json({ id: u.id, email: u.email, name: u.name, mobile: u.mobile, role: u.role, totpEnabled: u.totp_enabled });
});

accountRouter.put("/me", async (req, res) => {
  const b = z
    .object({ name: z.string().trim().max(120), mobile: z.string().trim().max(20) })
    .parse(req.body);
  const row = await one("UPDATE users SET name = $1, mobile = $2 WHERE id = $3 RETURNING id, email, name, mobile, role", [
    b.name, b.mobile, req.user!.id,
  ]);
  res.json(row);
});

/* ------------------------------ addresses ------------------------------ */

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).default("Home"),
  governorate: z.enum(GOVERNORATES),
  city: z.string().trim().min(1).max(120),
  address: z.string().trim().min(3).max(500),
  apartment: z.string().trim().max(200).default(""),
  mobile: z.string().trim().max(20).default(""),
  isDefault: z.boolean().default(false),
});

const ADDRESS_COLS = `id, label, governorate, city, address, apartment, mobile, is_default AS "isDefault"`;

accountRouter.get("/me/addresses", async (req, res) => {
  res.json(await query(`SELECT ${ADDRESS_COLS} FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id`, [req.user!.id]));
});

accountRouter.post("/me/addresses", async (req, res) => {
  const a = addressSchema.parse(req.body);
  const row = await tx(async (db) => {
    if (a.isDefault) await db.query("UPDATE addresses SET is_default = FALSE WHERE user_id = $1", [req.user!.id]);
    return (
      await db.query(
        `INSERT INTO addresses (user_id, label, governorate, city, address, apartment, mobile, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${ADDRESS_COLS}`,
        [req.user!.id, a.label, a.governorate, a.city, a.address, a.apartment, a.mobile, a.isDefault],
      )
    ).rows[0];
  });
  res.status(201).json(row);
});

accountRouter.put("/me/addresses/:id", async (req, res) => {
  const a = addressSchema.parse(req.body);
  const id = Number(req.params.id);
  const row = await tx(async (db) => {
    if (a.isDefault) await db.query("UPDATE addresses SET is_default = FALSE WHERE user_id = $1", [req.user!.id]);
    return (
      await db.query(
        `UPDATE addresses SET label=$3, governorate=$4, city=$5, address=$6, apartment=$7, mobile=$8, is_default=$9
         WHERE id=$1 AND user_id=$2 RETURNING ${ADDRESS_COLS}`,
        [id, req.user!.id, a.label, a.governorate, a.city, a.address, a.apartment, a.mobile, a.isDefault],
      )
    ).rows[0];
  });
  if (!row) throw new HttpError(404, "Address not found");
  res.json(row);
});

accountRouter.delete("/me/addresses/:id", async (req, res) => {
  await query("DELETE FROM addresses WHERE id = $1 AND user_id = $2", [Number(req.params.id), req.user!.id]);
  res.status(204).end();
});

/* ------------------------------ orders ------------------------------ */

const ORDER_COLS = `o.id, o.order_number AS "orderNumber", o.status, o.created_at AS "createdAt",
  o.customer_name AS "customerName", o.email, o.mobile, o.governorate, o.city, o.address, o.apartment, o.notes,
  o.promo_code AS "promoCode", o.subtotal_cents AS "subtotalCents", o.discount_cents AS "discountCents",
  o.shipping_cents AS "shippingCents", o.total_cents AS "totalCents", o.payment_method AS "paymentMethod"`;

const ITEMS_AGG = `COALESCE((SELECT json_agg(json_build_object('productId', i.product_id, 'name', i.product_name,
  'color', i.color, 'size', i.size, 'quantity', i.quantity, 'unitPriceCents', i.unit_price_cents, 'imageUrl', i.image_url,
  'slug', (SELECT slug FROM products WHERE id = i.product_id)) ORDER BY i.id)
  FROM order_items i WHERE i.order_id = o.id), '[]') AS items`;

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "canceled", "returned"] as const;

accountRouter.get("/me/orders", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const params: unknown[] = [req.user!.id];
  let where = "o.user_id = $1";
  if (status) {
    if (!(STATUSES as readonly string[]).includes(status)) throw new HttpError(400, "Unknown status");
    params.push(status);
    where += " AND o.status = $2";
  }
  res.json(await query(`SELECT ${ORDER_COLS}, ${ITEMS_AGG} FROM orders o WHERE ${where} ORDER BY o.created_at DESC`, params));
});

accountRouter.get("/me/orders/:orderNumber", async (req, res) => {
  const row = await one(
    `SELECT ${ORDER_COLS}, ${ITEMS_AGG},
       COALESCE((SELECT json_agg(json_build_object('status', h.status, 'note', h.note, 'createdAt', h.created_at) ORDER BY h.id)
                 FROM order_status_history h WHERE h.order_id = o.id), '[]') AS history
     FROM orders o WHERE o.order_number = $1 AND o.user_id = $2`,
    [String(req.params.orderNumber), req.user!.id],
  );
  if (!row) throw new HttpError(404, "Order not found");
  res.json(row);
});

/** Customers can cancel their own order only while it is still pending. */
accountRouter.post("/me/orders/:orderNumber/cancel", async (req, res) => {
  const result = await tx(async (db) => {
    const o = (
      await db.query("SELECT id, status FROM orders WHERE order_number = $1 AND user_id = $2 FOR UPDATE", [
        String(req.params.orderNumber), req.user!.id,
      ])
    ).rows[0];
    if (!o) throw new HttpError(404, "Order not found");
    if (o.status !== "pending") throw new HttpError(409, "Only orders that haven't been confirmed can be canceled. Please contact us.");
    await restockOrder(db, o.id);
    await db.query("UPDATE orders SET status = 'canceled' WHERE id = $1", [o.id]);
    await db.query("INSERT INTO order_status_history (order_id, status, note) VALUES ($1,'canceled','Canceled by customer')", [o.id]);
    return { id: o.id as number, status: "canceled" };
  });
  void notifyOrderStatus(result.id);
  res.json({ status: result.status });
});

export async function restockOrder(db: Db, orderId: number) {
  const items = (await db.query("SELECT product_id, size, quantity FROM order_items WHERE order_id = $1", [orderId])).rows;
  for (const it of items) {
    if (it.product_id == null) continue;
    await db.query("UPDATE product_variants SET stock = stock + $1 WHERE product_id = $2 AND size = $3", [
      it.quantity, it.product_id, it.size,
    ]);
  }
}
